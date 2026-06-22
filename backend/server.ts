import "dotenv/config";
import express from "express";
import type { Request, Response } from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import axios from "axios";
import crypto from "node:crypto";
import { sessionMiddleware } from "./session.config.js";
import { Resolver, resolveMx } from "node:dns/promises";
import { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";
import type { User, Task } from "@prisma/client";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { sendRecoveryCode, sendVerificationCode } from "./src/services/mailer.service.js";
import { parseIssueBody, normalizeTask } from "./src/services/githubIssueParser.service.js";

const app = express();
const prisma = new PrismaClient();
const PORT = 3001;
const SALT_ROUNDS = 12;
const RESET_CODE_EXPIRY_MINUTES = 15;
const SIGNUP_CODE_EXPIRY_MINUTES = 15;
const JWT_EXPIRES_IN = "1h";
const JWT_SECRET = process.env.JWT_SECRET || "please-set-a-secure-secret";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || "";
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || "";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@#$!%*?&^()[\]{}+\-_=~`|:;"'<>,./\\])[A-Za-z\d@#$!%*?&^()[\]{}+\-_=~`|:;"'<>,./\\]{8,}$/;
const BCRYPT_HASH_REGEX = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;
const fallbackDnsResolver = new Resolver();
fallbackDnsResolver.setServers(["1.1.1.1", "8.8.8.8"]);

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use(sessionMiddleware);
app.use(express.json());

const isValidObjectId = (value: string) => /^[a-fA-F0-9]{24}$/.test(value);

async function createHistoryEntry(taskId: string, eventType: string, details: string) {
  try {
    await prisma.taskHistory.create({
      data: {
        taskId,
        eventType,
        details,
      },
    });
  } catch (error) {
    console.error("History entry failed:", error);
  }
}

app.get("/api/health", (req: Request, res: Response) => {
  res.json({ status: "ok", message: "Backend running" });
});

app.get("/api/auth/github", async (req: Request, res: Response) => {
  try {
    const userId = (req.query.userId as string) || getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(400).json({ error: "Missing authenticated user ID for GitHub authorization" });
    }

    if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
      return res.status(500).json({ error: "GitHub OAuth is not configured" });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const state = createGithubOAuthState(userId);
    const redirectUrl = new URL("https://github.com/login/oauth/authorize");
    redirectUrl.searchParams.set("client_id", GITHUB_CLIENT_ID);
    redirectUrl.searchParams.set("redirect_uri", `${req.protocol}://${req.get("host")}/api/auth/github/callback`);
    redirectUrl.searchParams.set("scope", "repo:status,read:org,read:project");
    redirectUrl.searchParams.set("state", state);
    redirectUrl.searchParams.set("allow_signup", "false");
    redirectUrl.searchParams.set("prompt", "consent");

    return res.redirect(redirectUrl.toString());
  } catch (error) {
    console.error("GitHub auth redirect error:", error);
    return res.status(500).json({ error: "Failed to redirect to GitHub authorization" });
  }
});

app.get("/api/auth/github/callback", async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;
    if (typeof code !== "string" || typeof state !== "string") {
      return res.status(400).send("GitHub callback missing code or state");
    }

    const parsedState = verifyGithubOAuthState(state);
    if (!parsedState) {
      return res.status(400).send("Invalid or expired GitHub OAuth state");
    }

    const tokenResponse = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
      },
      {
        headers: {
          Accept: "application/json",
        },
      }
    );

    const { access_token: accessToken, error, error_description: errorDescription } = tokenResponse.data as {
      access_token?: string;
      error?: string;
      error_description?: string;
    };

    if (error || !accessToken) {
      console.error("GitHub token exchange failed:", tokenResponse.data);
      const redirectUrl = new URL(FRONTEND_URL);
      redirectUrl.searchParams.set("githubError", errorDescription || "Unable to connect GitHub");
      return res.redirect(redirectUrl.toString());
    }

    const githubUserResponse = await axios.get("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
      },
    });

    const { id: githubId, login: githubUsername } = githubUserResponse.data as {
      id?: number;
      login?: string;
    };

    if (!githubId || !githubUsername) {
      const redirectUrl = new URL(FRONTEND_URL);
      redirectUrl.searchParams.set("githubError", "Failed to fetch GitHub user profile.");
      return res.redirect(redirectUrl.toString());
    }

    const existingLink = await prisma.user.findFirst({
      where: { githubId: String(githubId), id: { not: parsedState.userId } },
    });

    if (existingLink) {
      // This GitHub account is already linked to a different user. Reject the connection.
      // While the request specified a 400 error, redirecting with an error param is more
      // consistent with the existing flow and provides a better user experience.
      const redirectUrl = new URL(FRONTEND_URL);
      redirectUrl.searchParams.set("githubError", "This GitHub account is already linked to another user.");
      return res.redirect(redirectUrl.toString());
    }

    await prisma.user.update({
      where: { id: parsedState.userId },
      data: {
        githubAccessToken: accessToken,
        githubAccessTokenUpdatedAt: new Date(),
        githubId: String(githubId),
        githubUsername: githubUsername,
      },
    });

    if (req.session) {
      req.session.githubAccessToken = accessToken;
      req.session.userId = parsedState.userId;
    }

    const redirectUrl = new URL(FRONTEND_URL);
    redirectUrl.searchParams.set("githubConnected", "1");
    return res.redirect(redirectUrl.toString());
  } catch (error) {
    console.error("GitHub OAuth callback error:", error);
    const redirectUrl = new URL(FRONTEND_URL);
    redirectUrl.searchParams.set("githubError", "GitHub authorization failed");
    return res.redirect(redirectUrl.toString());
  }
});

app.get("/api/github/projects", async (req: Request, res: Response) => {
  console.log("====================================");
  console.log("GITHUB PROJECTS ROUTE HIT");
  console.log("====================================");

  try {
    const userId = getAuthenticatedUserId(req) || (req.query.userId as string) || null;
    const owner = req.query.owner as string;
    const repo_name = req.query.repo_name as string;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required to list GitHub repositories" });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const accessToken = user?.githubAccessToken || req.session.githubAccessToken;
    if (!accessToken) {
      return res.status(401).json({ error: "GitHub account is not connected" });
    }

    if (owner && repo_name) {
      const query = `
        query($owner: String!, $repo_name: String!) {
          repository(owner: $owner, name: $repo_name) {
            projectsV2(first: 100) {
              nodes {
                id
                number
                title
              }
            }
          }
        }
      `;
      
      const graphqlResponse = await axios.post("https://api.github.com/graphql", { 
        query,
        variables: { owner, repo_name }
      }, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      });

      // 🔍 NEW: Catch silent GraphQL permission/query errors
      if (graphqlResponse.data?.errors) {
        console.error("❌ GitHub GraphQL Errors:", graphqlResponse.data.errors);
        return res.status(400).json({ 
          error: "GitHub API Error", 
          details: graphqlResponse.data.errors 
        });
      }

      const projects = graphqlResponse.data?.data?.repository?.projectsV2?.nodes || [];
      
      console.log(`🚀 Found ${projects.length} projects for ${owner}/${repo_name}`);
      return res.json({ projects });
    }

    // fallback logic to list user repos...
    const response = await axios.get("https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    const repos = Array.isArray(response.data)
      ? response.data.map((repo: any) => ({
          name: String(repo.name || ""),
          fullName: String(repo.full_name || ""),
        }))
      : [];

    return res.json({ repos });
  } catch (error: any) {
    console.error("GitHub projects fetch error:", error?.response?.data || error.message);
    return res.status(500).json({ error: "Unable to fetch GitHub repositories" });
  }
});
app.post("/api/github/fetch-issues", async (req: Request<{}, {}, { repoPath?: string; userId?: string }>, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req) || req.body.userId || null;
    const repoPath = req.body.repoPath?.trim();

    if (!repoPath) {
      return res.status(400).json({ error: "Repository path is required" });
    }

    if (!userId) {
      return res.status(401).json({ error: "Authentication required to fetch repository issues" });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const accessToken = user?.githubAccessToken || req.session.githubAccessToken;
    if (!accessToken) {
      return res.status(401).json({ error: "GitHub account is not connected" });
    }

    const [owner, repo] = repoPath.split("/");
    if (!owner || !repo) {
      return res.status(400).json({ error: "Repository path must be in owner/repo format" });
    }

    // Fetch the 10 custom issues we generated earlier
    const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/issues?state=open&per_page=100`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    const issues = Array.isArray(response.data) ? response.data : [];
    const openIssues = issues.filter((issue: any) => !issue.pull_request);

    if (!openIssues.length) {
      return res.json({ success: true, tasks: [], emptyProject: true, message: "No open issues found." });
    }

    const createdTasks = [];

    const parseGitHubLabels = (rawLabels: any): Array<{ name: string; color: string; description: string }> => {
      if (!Array.isArray(rawLabels)) return [];

      return rawLabels
        .map((label: any) => {
          if (typeof label === "string") {
            return {
              name: label.trim(),
              color: "",
              description: "",
            };
          }

          if (label && typeof label === "object") {
            return {
              name: String(label.name || "").trim(),
              color: String(label.color || "").trim(),
              description: String(label.description || "").trim(),
            };
          }

          return { name: "", color: "", description: "" };
        })
        .filter((label) => label.name.length > 0);
    };

    for (const issue of openIssues) {
      const githubIssueId = String(issue.id);
      const rawBody = issue.body || "";
      const taskLabels = parseGitHubLabels(issue.labels);

      // 🔍 1. Safely extract plain text labels from GitHub Metadata array
      const gitHubLabelNames: string[] = Array.isArray(issue.labels) 
        ? issue.labels.map((l: any) => String(l.name || l)) 
        : [];

      // 🪄 2. REAL MARKDOWN ENGINE: Parses your exact "- ac 1-" and header convention
      const parseSectionItems = (bodyText: string, sectionHeader: string): any[] => {
        if (!bodyText) return [];

        // Locates sections like "## Acceptance Criteria", "## Test Cases", etc.
        // Use (?=##|---|$) lookahead so the terminator isn't consumed; allows last section to reach end-of-string.
        const sectionRegex = new RegExp(`## ${sectionHeader}\\s*([\\s\\S]*?)(?=\\s*##|\\s*---|$)`, "i");
        const match = bodyText.match(sectionRegex);
        if (!match || !match[1]) return [];

        const rawSectionContent = match[1].trim();
        
        // Splits by lines starting with standard markdown lists or your specific "- ac 1-" convention
        const lines = rawSectionContent.split(/\r?\n/);
        const criteriaItems: any[] = [];

        lines.forEach((line) => {
          const cleanLine = line.trim();
          // Regex captures strings like "- ac 1- User can do X" or "- Verify X"
          if (cleanLine.startsWith("-") || cleanLine.startsWith("*")) {
            const formattedText = cleanLine
              .replace(/^[\s*-]+\s*(ac\s*\d+\s*-\s*)*/i, "") // Cleans off the "- ac 1-" list markers for clean reading
              .trim();

            if (formattedText) {
              criteriaItems.push({
                id: `val-${githubIssueId}-${Math.random().toString(36).substring(2, 7)}`,
                text: formattedText,
                status: "pending",
                failedBy: null,
                failedAt: null,
                failureReason: null,
                testerNotes: null,
                labels: gitHubLabelNames // 🔌 Injects GitHub labels into every single sub-item safely!
              });
            }
          }
        });

        return criteriaItems;
      };

      const existingTask = await prisma.task.findFirst({
        where: { githubIssueId, userId },
      });

      // Avoid duplication on continuous pulls
      if (!existingTask) {
        const newTask = await prisma.task.create({
          data: {
            name: issue.title,
            description: rawBody,
            status: "TODO",
            userId,
            githubIssueId,
            githubRepo: repoPath,
            labels: JSON.parse(JSON.stringify(taskLabels)),
            // 💾 Parses your exact layout streams into persistent Prisma models carrying your tokens
            acceptanceCriteria: parseSectionItems(rawBody, "Acceptance Criteria"),
            testCases: parseSectionItems(rawBody, "Test Cases"),
            positiveTestCases: parseSectionItems(rawBody, "Positive Test Cases"),
            negativeTestCases: parseSectionItems(rawBody, "Negative Test Cases"),
            edgeCases: parseSectionItems(rawBody, "Edge Cases")
          },
        });
        createdTasks.push(newTask);
      } else {
        await prisma.task.update({
          where: { id: existingTask.id },
          data: {
            labels: JSON.parse(JSON.stringify(taskLabels)),
          },
        });
      }
    }

    return res.json({ success: true, count: createdTasks.length, tasks: createdTasks });
  } catch (error: any) {
    console.error("GitHub bulk issues ingestion failure:", error);
    return res.status(500).json({ error: error.message || "Failed to parse repository issues" });
  }
});
app.post("/api/github/project-issues", async (req: Request, res: Response): Promise<any> => {
  try {
    const { projectId, userId: bodyUserId } = req.body;
    const userId = getAuthenticatedUserId(req) || bodyUserId || null;

    if (!projectId) {
      return res.status(400).json({ error: "Project ID is required" });
    }

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const accessToken = user?.githubAccessToken || (req.session as any)?.githubAccessToken;
    if (!accessToken) {
      return res.status(401).json({ error: "GitHub account is not connected" });
    }

    const query = `
      query($projectId: ID!) {
        node(id: $projectId) {
          ... on ProjectV2 {
            items(first: 100) {
              nodes {
                content {
                  ... on Issue {
                    id
                    title
                    body
                    labels(first: 100) {
                      nodes {
                        name
                        color
                        description
                      }
                    }
                    repository {
                      nameWithOwner
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    const graphqlResponse = await axios.post("https://api.github.com/graphql", {
      query,
      variables: { projectId }
    }, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      }
    });

    const items = graphqlResponse.data?.data?.node?.items?.nodes || [];
    
    let importedCount = 0;
    
    for (const item of items) {
      const issue = item.content;
      if (!issue || !issue.title || !issue.id) continue;
      
      const title = String(issue.title);
      const body = issue.body ? String(issue.body) : "";
      const githubIssueId = String(issue.id);
      const githubRepo = issue.repository?.nameWithOwner ? String(issue.repository.nameWithOwner) : undefined;
      const issueLabels = Array.isArray(issue.labels?.nodes)
        ? issue.labels.nodes
            .map((label: any) => ({
              name: String(label?.name || "").trim(),
              color: String(label?.color || "").trim(),
              description: String(label?.description || "").trim(),
            }))
            .filter((label: { name: string }) => label.name.length > 0)
        : [];

      const existingTask = await prisma.task.findFirst({
        where: {
          githubIssueId,
          userId: String(userId)
        }
      });

      const parsed = parseIssueBody(body);

      if (existingTask) {
        await prisma.task.update({
          where: { id: existingTask.id },
          data: {
            description: parsed.description,
            labels: JSON.parse(JSON.stringify(issueLabels)),
            acceptanceCriteria: JSON.parse(JSON.stringify(parsed.acceptanceCriteria)),
            testCases: JSON.parse(JSON.stringify(parsed.testCases)),
            positiveTestCases: JSON.parse(JSON.stringify(parsed.positiveTestCases)),
            negativeTestCases: JSON.parse(JSON.stringify(parsed.negativeTestCases)),
            edgeCases: JSON.parse(JSON.stringify(parsed.edgeCases)),
            technicalNotes: JSON.parse(JSON.stringify(parsed.technicalNotes)),
            definitionOfDone: JSON.parse(JSON.stringify(parsed.definitionOfDone)),
            dependencies: JSON.parse(JSON.stringify(parsed.dependencies)),
            riskAssessment: JSON.parse(JSON.stringify(parsed.riskAssessment)),
          },
        });
        importedCount++;
        continue;
      }

      await prisma.task.create({
        data: {
          name: title,
          description: parsed.description,
          status: "Backlog",
          userId: String(userId),
          githubIssueId,
          githubRepo: githubRepo || null,
          labels: JSON.parse(JSON.stringify(issueLabels)),
          acceptanceCriteria: JSON.parse(JSON.stringify(parsed.acceptanceCriteria)),
          testCases: JSON.parse(JSON.stringify(parsed.testCases)),
          positiveTestCases: JSON.parse(JSON.stringify(parsed.positiveTestCases)),
          negativeTestCases: JSON.parse(JSON.stringify(parsed.negativeTestCases)),
          edgeCases: JSON.parse(JSON.stringify(parsed.edgeCases)),
          technicalNotes: JSON.parse(JSON.stringify(parsed.technicalNotes)),
          definitionOfDone: JSON.parse(JSON.stringify(parsed.definitionOfDone)),
          dependencies: JSON.parse(JSON.stringify(parsed.dependencies)),
          riskAssessment: JSON.parse(JSON.stringify(parsed.riskAssessment)),
        },
      });
      importedCount++;
    }

    return res.json({ success: true, importedCount });
  } catch (error) {
    console.error("GitHub fetch project issues error:", error);
    return res.status(500).json({ error: "Failed to fetch project issues from GitHub" });
  }
});



const normalizeEmail = (email: string) => email.trim().toLowerCase();

const isStrongPassword = (password: string) => STRONG_PASSWORD_REGEX.test(password);

function getTokenFromHeader(req: Request) {
  const authHeader = req.headers.authorization;

  console.log("\n========== AUTH DEBUG ==========");
  console.log("AUTH HEADER:", authHeader);
  console.log("================================\n");

  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.substring(7);
}

function decodeJwtToken(token: string) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET!);

    console.log("\n========== JWT DEBUG ==========");
    console.log("JWT DECODED:", decoded);
    console.log("================================\n");

    return decoded;
  } catch (error) {
    console.log("\n========== JWT ERROR ==========");
    console.log(error);
    console.log("================================\n");

    return null;
  }
}

function getAuthenticatedUserId(req: Request) {
  const token = getTokenFromHeader(req);

  console.log("================================");
  console.log("TOKEN EXISTS:", !!token);
  console.log("AUTH HEADER:", req.headers.authorization);
  console.log("================================");

  if (!token) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET!);

    console.log("================================");
    console.log("JWT DECODED:", decoded);
    console.log("================================");

    const userId = (decoded as any).sub;

    console.log("USER ID:", userId);

    return userId ?? null;
  } catch (error) {
    console.log("================================");
    console.log("JWT VERIFY ERROR:", error);
    console.log("================================");

    return null;
  }
}
function createGithubOAuthState(userId: string) {
  const payload = JSON.stringify({ userId, createdAt: Date.now() });
  const signature = crypto.createHmac("sha256", JWT_SECRET!).update(payload).digest("hex");
  return Buffer.from(`${payload}::${signature}`, "utf8").toString("base64url");
}

function verifyGithubOAuthState(rawState: string) {
  try {
    const decoded = Buffer.from(rawState, "base64url").toString("utf8");
    const parts = decoded.split("::");
    if (parts.length !== 2) return null;
    const [payload, signature] = parts as [string, string];
    const expected = crypto.createHmac("sha256", JWT_SECRET!).update(payload).digest("hex");
    if (signature !== expected) return null;

    const parsed = JSON.parse(payload) as { userId: string; createdAt: number };
    if (!parsed.userId || typeof parsed.createdAt !== "number") return null;
    if (Date.now() - parsed.createdAt > 10 * 60 * 1000) return null;

    return parsed;
  } catch {
    return null;
  }
}

const getPasswordValidationMessage = () =>
  "Password must be at least 8 characters and include uppercase, lowercase, number, and special symbol.";

async function hasMailExchange(domain: string) {
  if (!domain) return false;

  try {
    const records = await resolveMx(domain);
    return records.some((record) => record.exchange.trim().length > 0);
  } catch (error) {
    const code = error instanceof Error && "code" in error ? error.code : "";
    const shouldRetry = ["ECONNREFUSED", "ETIMEOUT", "ESERVFAIL"].includes(String(code));

    if (!shouldRetry) return false;

    try {
      const records = await fallbackDnsResolver.resolveMx(domain);
      return records.some((record) => record.exchange.trim().length > 0);
    } catch {
      return false;
    }
  }
}

async function validateSignupInput(email: string, password: string) {
  const normalized = email.trim().toLowerCase();
  const gmailPattern = /^[^\s@]+@gmail\.com$/;

  if (!gmailPattern.test(normalized)) {
    return "Gmail account does not exist";
  }

  if (!isStrongPassword(password)) {
    return getPasswordValidationMessage();
  }

  const domain = normalized.split("@")[1];
  if (!domain) {
    return "Gmail account does not exist";
  }

  const hasMxRecords = await hasMailExchange(domain);
  if (!hasMxRecords) {
    return "Gmail account does not exist";
  }

  return null;
}

const createResetCode = () => crypto.randomInt(100000, 1000000).toString();

const createResetExpiry = () => new Date(Date.now() + RESET_CODE_EXPIRY_MINUTES * 60 * 1000);

const createSignupExpiry = () => new Date(Date.now() + SIGNUP_CODE_EXPIRY_MINUTES * 60 * 1000);

function createJwtToken(user: { id: string; email: string; username: string }) {
  return jwt.sign({ sub: user.id, email: user.email, username: user.username }, JWT_SECRET!, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

interface SignupBody {
  username?: string;
  email?: string;
  password?: string;
}

async function signupHandler(req: Request<{}, {}, SignupBody>, res: Response): Promise<any> {
  try {
    const { username, password } = req.body;
    const email = req.body.email ? normalizeEmail(req.body.email) : "";

    if (!username || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const validationError = await validateSignupInput(email, password);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const signupVerificationCode = createResetCode();
    const signupCodeExpires = createSignupExpiry();

    const user: User = await prisma.user.create({
      data: {
        username: username.trim(),
        email,
        password: hashedPassword,
        isVerified: false,
        signupVerificationCode,
        signupCodeExpires,
      },
    });

    await sendVerificationCode(email, signupVerificationCode);

    return res.status(201).json({
      success: true,
      message: "Signup verification code sent to email",
      email: user.email,
    });
  } catch (error) {
    console.error("Signup Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

app.post("/api/auth/signup", signupHandler);
app.post("/auth/signup", signupHandler);

interface LoginBody {
  email?: string;
  password?: string;
}

app.post("/api/auth/login", async (req: Request<{}, {}, LoginBody>, res: Response): Promise<any> => {
  try {
    const { password } = req.body;
    const email = req.body.email ? normalizeEmail(req.body.email) : "";

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    if (!user.isVerified) {
      return res.status(401).json({ error: "Account not verified" });
    }

    const storedPassword = user.password || "";
    const passwordMatches = BCRYPT_HASH_REGEX.test(storedPassword)
      ? await bcrypt.compare(password, storedPassword)
      : storedPassword === password;

    if (!passwordMatches) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    if (!BCRYPT_HASH_REGEX.test(storedPassword)) {
      await prisma.user.update({
        where: { id: user.id },
        data: { password: await bcrypt.hash(password, SALT_ROUNDS) },
      });
    }

    const token = createJwtToken(user);
    if (req.session) {
      req.session.userId = user.id;
    }

    return res.status(200).json({
      success: true,
      message: "Login successful",
      userId: user.id,
      username: user.username,
      token,
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

interface ForgotPasswordBody {
  email?: string;
}

interface VerifySignupBody {
  email?: string;
  signupVerificationCode?: string;
}

interface GoogleLoginBody {
  idToken?: string;
}

async function verifySignupHandler(req: Request<{}, {}, VerifySignupBody>, res: Response): Promise<any> {
  try {
    const email = req.body.email ? normalizeEmail(req.body.email) : "";
    const code = req.body.signupVerificationCode?.trim() || "";

    if (!email || !code) {
      return res.status(400).json({ error: "Email and verification code are required" });
    }

    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: "Verification code must be 6 digits" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ error: "Invalid verification code" });
    }

    if (user.isVerified) {
      return res.status(400).json({ error: "Account already verified" });
    }

    if (!user.signupVerificationCode || !user.signupCodeExpires) {
      return res.status(400).json({ error: "Invalid or expired verification code" });
    }

    if (user.signupVerificationCode !== code || user.signupCodeExpires.getTime() < Date.now()) {
      return res.status(400).json({ error: "Invalid or expired verification code" });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        signupVerificationCode: null,
        signupCodeExpires: null,
      },
    });

    const token = createJwtToken(user);

    return res.status(200).json({
      success: true,
      message: "Signup verification successful",
      token,
      userId: user.id,
      username: user.username,
    });
  } catch (error) {
    console.error("Verify Signup Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

async function googleLoginHandler(req: Request<{}, {}, GoogleLoginBody>, res: Response): Promise<any> {
  try {
    const idToken = req.body.idToken?.trim() || "";
    if (!idToken || !GOOGLE_CLIENT_ID) {
      return res.status(400).json({ error: "Google login is not configured" });
    }

    const client = new OAuth2Client(GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const email = payload?.email?.toLowerCase();
    const name = payload?.name || payload?.email?.split("@")[0] || "Google User";

    if (!email) {
      return res.status(400).json({ error: "Google login failed to provide email" });
    }

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      const hashedPassword = await bcrypt.hash(crypto.randomUUID(), SALT_ROUNDS);
      user = await prisma.user.create({
        data: {
          username: name,
          email,
          password: hashedPassword,
          isVerified: true,
        },
      });
    } else if (!user.isVerified) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { isVerified: true },
      });
    }

    const token = createJwtToken(user);
    req.session.userId = user.id;

    return res.status(200).json({
      success: true,
      message: "Google login successful",
      token,
      userId: user.id,
      username: user.username,
    });
  } catch (error) {
    console.error("Google Login Error:", error);
    return res.status(500).json({ error: "Google login failed" });
  }
}

async function forgotPasswordHandler(req: Request<{}, {}, ForgotPasswordBody>, res: Response): Promise<any> {
  try {
    const email = req.body.email ? normalizeEmail(req.body.email) : "";

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: "No account found for that email" });
    }

    const resetCode = createResetCode();
    const resetCodeExpires = createResetExpiry();

    await prisma.user.update({
      where: { id: user.id },
      data: { resetCode, resetCodeExpires },
    });

    await sendRecoveryCode(email, resetCode);

    return res.status(200).json({
      success: true,
      message: "Verification code generated and emailed.",
    });
  } catch (error) {
    console.error("Forgot Password Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

interface ResetPasswordBody {
  email?: string;
  resetCode?: string;
  newPassword?: string;
}

async function resetPasswordHandler(req: Request<{}, {}, ResetPasswordBody>, res: Response): Promise<any> {
  try {
    const email = req.body.email ? normalizeEmail(req.body.email) : "";
    const resetCode = req.body.resetCode?.trim() || "";
    const { newPassword } = req.body;

    if (!email || !resetCode || !newPassword) {
      return res.status(400).json({ error: "Email, resetCode, and new password are required" });
    }

    if (!/^\d{6}$/.test(resetCode)) {
      return res.status(400).json({ error: "Verification code must be 6 digits" });
    }

    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({ error: getPasswordValidationMessage() });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.resetCode || !user.resetCodeExpires) {
      return res.status(400).json({ error: "Invalid or expired verification code" });
    }

    if (user.resetCode !== resetCode || user.resetCodeExpires.getTime() < Date.now()) {
      return res.status(400).json({ error: "Invalid or expired verification code" });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: await bcrypt.hash(newPassword, SALT_ROUNDS),
        resetCode: null,
        resetCodeExpires: null,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Password reset successful",
    });
  } catch (error) {
    console.error("Reset Password Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

app.post("/api/auth/login", async (req: Request<{}, {}, LoginBody>, res: Response): Promise<any> => {
  try {
    const { password } = req.body;
    const email = req.body.email ? normalizeEmail(req.body.email) : "";

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    if (!user.isVerified) {
      return res.status(401).json({ error: "Account not verified" });
    }

    const storedPassword = user.password || "";
    const passwordMatches = BCRYPT_HASH_REGEX.test(storedPassword)
      ? await bcrypt.compare(password, storedPassword)
      : storedPassword === password;

    if (!passwordMatches) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    if (!BCRYPT_HASH_REGEX.test(storedPassword)) {
      await prisma.user.update({
        where: { id: user.id },
        data: { password: await bcrypt.hash(password, SALT_ROUNDS) },
      });
    }

    const token = createJwtToken(user);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      userId: user.id,
      username: user.username,
      token,
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/auth/forgot-password", forgotPasswordHandler);
app.post("/api/auth/reset-password", resetPasswordHandler);
app.post("/api/auth/verify-signup", verifySignupHandler);
app.post("/api/auth/google-login", googleLoginHandler);
app.post("/auth/forgot-password", forgotPasswordHandler);
app.post("/auth/reset-password", resetPasswordHandler);
app.post("/auth/verify-signup", verifySignupHandler);
app.post("/auth/google-login", googleLoginHandler);

app.get("/api/users/:userId", async (req: Request<{ userId: string }>, res: Response): Promise<any> => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ error: "User ID is required" });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({ id: user.id, username: user.username, email: user.email });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

interface ValidationItem {
  id?: string;
  text: string;
  status?: string;
  failedBy?: string | null;
  failedAt?: string | null;
  failureReason?: string | null;
  testerNotes?: string | null;
}

interface CreateTaskBody {
  name?: string;
  description?: string;
  userId?: string;
  testCases?: ValidationItem[];
}

app.post("/api/tasks", async (req: Request<{}, {}, CreateTaskBody>, res: Response): Promise<any> => {
  try {
    const { name, description, userId, testCases } = req.body;

    if (!name || !userId) {
      return res.status(400).json({ error: "Task name and User ID are required" });
    }

    const task: Task = await prisma.task.create({
      data: {
        name,
        description: description || "",
        status: "Backlog",
        userId,
        acceptanceCriteria: [],
        edgeCases: [],
        technicalNotes: [],
        testCases: (testCases && testCases.length > 0 ? testCases : [{ id: crypto.randomUUID(), text: "Unit Integration Test", status: "pending", failedBy: null, failedAt: null, failureReason: null, testerNotes: null }]) as any,
      },
    });

    await createHistoryEntry(task.id, "STATUS_CHANGE", "Task created under status: Backlog");

    return res.status(201).json(normalizeTask(task));
  } catch (error) {
    console.error("Create Task Error:", error);
    return res.status(500).json({ error: "Failed to create task" });
  }
});

app.get("/api/tasks/:userId", async (req: Request<{ userId: string }>, res: Response): Promise<any> => {
  try {
    const { userId } = req.params;
    const githubRepo = typeof req.query.githubRepo === "string" ? req.query.githubRepo.trim() : "";
    if (!userId) return res.status(400).json({ error: "User ID is required" });

    const tasks = await prisma.task.findMany({
      where: {
        userId,
        ...(githubRepo ? { githubRepo } : {}),
      },
      include: {
        timeLogs: true,
        history: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return res.json(tasks.map((task) => normalizeTask(task)));
  } catch (error) {
    console.error("Get Tasks Error:", error);
    return res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

interface UpdateTaskBody {
  name?: string;
  description?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  effortRequired?: string | number;
  workStatus?: string;
  deployedTime?: string;
  deploymentType?: string;
  testCases?: ValidationItem[];
  acceptanceCriteria?: ValidationItem[];
  edgeCases?: ValidationItem[];
  technicalNotes?: ValidationItem[];
  positiveTestCases?: ValidationItem[];
  negativeTestCases?: ValidationItem[];
  definitionOfDone?: ValidationItem[];
  testingSummary?: any;
  failureReasons?: any;
  deploymentDetails?: any;
  testRunResult?: string;
}

interface PrismaUpdateData {
  name?: string;
  description?: string;
  status?: string;
  workStatus?: string;
  deploymentType?: string;
  startDate?: Date;
  endDate?: Date;
  deployedTime?: Date;
  effortRequired?: number;
  testCases?: any;
  acceptanceCriteria?: any;
  edgeCases?: any;
  technicalNotes?: any;
  positiveTestCases?: any;
  negativeTestCases?: any;
  definitionOfDone?: any;
  testingSummary?: any;
  failureReasons?: any;
  deploymentDetails?: any;
}

app.put("/api/tasks/:taskId", async (req: Request<{ taskId: string }, {}, UpdateTaskBody>, res: Response): Promise<any> => {
  try {
    const { taskId } = req.params;
    const {
      name,
      description,
      status,
      startDate,
      endDate,
      effortRequired,
      workStatus,
      deployedTime,
      deploymentType,
      testCases,
      acceptanceCriteria,
      edgeCases,
      technicalNotes,
      positiveTestCases,
      negativeTestCases,
      definitionOfDone,
      testingSummary,
      failureReasons,
      deploymentDetails,
      testRunResult,
    } = req.body;

    if (!taskId || !isValidObjectId(taskId)) {
      return res.status(400).json({ error: "Invalid task ID format" });
    }

    const existingTask = await prisma.task.findUnique({ where: { id: taskId } });
    if (!existingTask) {
      return res.status(404).json({ error: "Task not found" });
    }

    if (status === "Deployed" && existingTask.status !== "Deployed") {
      const getItems = (items: any) => (Array.isArray(items) ? items : []);
      const deploymentValidationItems = [
        ...getItems(acceptanceCriteria || existingTask.acceptanceCriteria),
        ...getItems(testCases || existingTask.testCases),
        ...getItems(positiveTestCases || existingTask.positiveTestCases),
        ...getItems(negativeTestCases || existingTask.negativeTestCases),
        ...getItems(edgeCases || existingTask.edgeCases),
        ...getItems(definitionOfDone || existingTask.definitionOfDone),
      ];
      const allPassed =
        deploymentValidationItems.length > 0 &&
        deploymentValidationItems.every((item: any) => item.status === "passed");

      if (!allPassed) {
        return res.status(400).json({ error: "Cannot deploy. Not all validation items are passed." });
      }
    }

    const updateData: PrismaUpdateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (workStatus !== undefined) updateData.workStatus = workStatus;
    if (deploymentType !== undefined) updateData.deploymentType = deploymentType;
    if (testCases !== undefined) updateData.testCases = testCases;
    if (acceptanceCriteria !== undefined) updateData.acceptanceCriteria = acceptanceCriteria;
    if (edgeCases !== undefined) updateData.edgeCases = edgeCases;
    if (technicalNotes !== undefined) updateData.technicalNotes = technicalNotes;
    if (positiveTestCases !== undefined) updateData.positiveTestCases = positiveTestCases;
    if (negativeTestCases !== undefined) updateData.negativeTestCases = negativeTestCases;
    if (definitionOfDone !== undefined) updateData.definitionOfDone = definitionOfDone;
    if (testingSummary !== undefined) updateData.testingSummary = testingSummary;
    if (failureReasons !== undefined) updateData.failureReasons = failureReasons;
    if (deploymentDetails !== undefined) updateData.deploymentDetails = deploymentDetails;
    if (startDate) updateData.startDate = new Date(startDate);
    if (endDate) updateData.endDate = new Date(endDate);
    if (deployedTime) updateData.deployedTime = new Date(deployedTime);
    if (effortRequired !== undefined) updateData.effortRequired = Number(effortRequired);

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
      include: {
        timeLogs: true,
        history: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (status !== undefined && status !== existingTask.status) {
      await createHistoryEntry(taskId, "STATUS_CHANGE", `Moved task from column \"${existingTask.status}\" to \"${status}\"`);
    }
    if (name !== undefined && name !== existingTask.name) {
      await createHistoryEntry(taskId, "TASK_EDITED", `Task name changed to: ${name}`);
    }
    if (description !== undefined && description !== existingTask.description) {
      await createHistoryEntry(taskId, "TASK_EDITED", `Task description updated.`);
    }
    if (testCases !== undefined) {
      const previousCases = Array.isArray(existingTask.testCases) ? existingTask.testCases.join(", ") : "none";
      const nextCases = Array.isArray(testCases) ? testCases.join(", ") : "none";
      if (previousCases !== nextCases) {
        await createHistoryEntry(taskId, "TEST_CASES_UPDATED", `Test cases changed from [${previousCases}] to [${nextCases}]`);
      }
    }
    if (testRunResult) {
      const type = testRunResult === "PASSED" ? "TEST_PASSED" : "TEST_FAILED";
      const detailMsg = testRunResult === "PASSED"
        ? "Automated test results passed validation successfully."
        : "Automated test results failed validation and the task was moved back to Backlog.";
      await createHistoryEntry(taskId, type, detailMsg);
    }

    return res.status(200).json({ success: true, task: normalizeTask(updatedTask) });
  } catch (error) {
    console.error("Update Task Error:", error);
    return res.status(500).json({ error: "Failed to update task" });
  }
});

interface TimeLogBody {
  date?: string;
  logDate?: string;
  hours?: string | number;
  hoursSpent?: string | number;
  description?: string;
}

// ✅ FIXED: Robust tracking engine mappings
app.post("/api/tasks/:taskId/time-logs", async (req: Request<{ taskId: string }, {}, TimeLogBody>, res: Response): Promise<any> => {
  try {
    const { taskId } = req.params;
    
    // Support alternate key formats seamlessly
    const rawDate = req.body.logDate || req.body.date;
    const rawHours = req.body.hoursSpent !== undefined ? req.body.hoursSpent : req.body.hours;
    const { description } = req.body;

    if (!rawDate || rawHours === undefined || !description) {
      return res.status(400).json({ error: "All time-log fields are required (date, hours, description)" });
    }

    const parseHours = parseFloat(rawHours.toString());
    if (isNaN(parseHours) || parseHours < 0) {
      return res.status(400).json({ error: "Hours cannot be negative" });
    }

    await prisma.$transaction(async (tx) => {
      await tx.timeLog.create({
        data: {
          taskId,
          logDate: new Date(rawDate),
          hoursSpent: parseHours,
          description,
        },
      });
      await tx.taskHistory.create({
        data: {
          taskId,
          eventType: "TIME_LOGGED",
          details: `Logged ${parseHours} hours on ${rawDate}. Notes: ${description}`,
        },
      });
    });

    return res.status(201).json({ success: true, message: "Time logged successfully" });
  } catch (error) {
    console.error("Time Log Error:", error);
    return res.status(500).json({ error: "Server error while saving time log" });
  }
});

interface StatusUpdateBody {
  status?: string;
}

app.patch("/api/tasks/:taskId/status", async (req: Request<{ taskId: string }, {}, StatusUpdateBody>, res: Response): Promise<any> => {
  try {
    const { taskId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: "Status field is required" });
    }

    await prisma.$transaction(async (tx) => {
      await tx.task.update({
        where: { id: taskId },
        data: { workStatus: status },
      });
      await tx.taskHistory.create({
        data: {
          taskId,
          eventType: "STATUS_UPDATED",
          details: `Work status changed to ${status}`,
        },
      });
    });

    return res.status(200).json({ success: true, message: "Status updated successfully" });
  } catch (error) {
    console.error("Status Patch Error:", error);
    return res.status(500).json({ error: "Server error while modifying work status" });
  }
});

interface TestRunPayload {
  name: string;
  startTime: string;
  endTime: string;
  status: "Passed" | "Failed";
}

interface TestResultsBody {
  results?: TestRunPayload[];
}

app.post("/api/tasks/:taskId/test-results", async (req: Request<{ taskId: string }, {}, TestResultsBody>, res: Response): Promise<any> => {
  try {
    const { taskId } = req.params;
    const { results } = req.body;

    if (!results || !Array.isArray(results)) {
      return res.status(400).json({ error: "Invalid test results payload structure." });
    }

    const existingTask = await prisma.task.findUnique({ where: { id: taskId } });
    if (!existingTask) {
      return res.status(404).json({ error: "Target workflow task not found." });
    }

    let allPassed = true;

    await prisma.$transaction(async (tx) => {
      for (const run of results) {
        const hours = Math.abs(new Date(run.endTime).getTime() - new Date(run.startTime).getTime()) / 3600000;
        await tx.timeLog.create({
          data: {
            taskId,
            logDate: new Date(run.startTime),
            hoursSpent: hours,
            description: `Test Case: [${run.name}] evaluated with verdict status: ${run.status}`,
          },
        });
        await tx.taskHistory.create({
          data: {
            taskId,
            eventType: "TEST_RUN",
            details: `Test Run [${run.name}] finished. Execution verdict state: ${run.status}`,
          },
        });
        if (run.status === "Failed") {
          allPassed = false;
        }
      }

      if (!allPassed) {
        await tx.task.update({
          where: { id: taskId },
          data: {
            status: "Backlog",
            workStatus: "Pending",
          },
        });
        await tx.taskHistory.create({
          data: {
            taskId,
            eventType: "TEST_FAILED",
            details: "Task failed validation testing suite and was automatically reversed back to Backlog.",
          },
        });
      } else {
        await tx.task.update({
          where: { id: taskId },
          data: {
            status: "Testing",
          },
        });
        await tx.taskHistory.create({
          data: {
            taskId,
            eventType: "TEST_PASSED",
            details: "All metrics passed validation. Moving task into the Testing lane.",
          },
        });
      }
    });

    return res.status(200).json({
      success: true,
      message: allPassed
        ? "All validation tests passed! Your task is verified and ready for deployment features."
        : "Tests failed! Task has been automatically moved back to the Backlog column.",
    });
  } catch (error) {
    console.error("Test Results Processing Error:", error);
    return res.status(500).json({ error: "Internal server exception handling execution validation matrices." });
  }
});

app.delete("/api/tasks/:taskId", async (req: Request<{ taskId: string }>, res: Response): Promise<any> => {
  try {
    const { taskId } = req.params;
    await prisma.task.delete({ where: { id: taskId } });
    return res.json({ success: true, message: "Task deleted" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to delete task" });
  }
});

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export { app };
