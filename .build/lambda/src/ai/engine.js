/**
 * Deterministic reasoning engine for Hackathon Copilot.
 *
 * This is the "brain" that produces project-specific analysis, scoping,
 * architecture, tasks, mentoring, reviews, and demo material.
 *
 * It is intentionally rule-driven so the product works end-to-end WITHOUT
 * requiring live AWS Bedrock access. When Bedrock IS available, the bedrock
 * client (bedrock.js) uses this engine's structured contracts as the target
 * output shape and falls back to it on any error.
 *
 * Everything here reads from actual project state, so the "agent" genuinely
 * observes -> analyzes -> decides -> recommends -> tracks -> re-evaluates.
 */

const FEATURE_KEYWORDS = [
  { re: /\b(auth|login|sign ?up|sign ?in|account|user)\b/i, feature: 'User authentication', effort: 'M', priority: 'MUST', aws: ['Cognito', 'Lambda', 'DynamoDB'] },
  { re: /\b(search|discover|find|browse|filter)\b/i, feature: 'Search & discovery', effort: 'M', priority: 'MUST', aws: ['Lambda', 'DynamoDB'] },
  { re: /\b(recommend|personali[sz]e|suggest|match)\b/i, feature: 'Personalized recommendations', effort: 'L', priority: 'NICE', aws: ['Bedrock', 'Lambda'] },
  { re: /\b(chat|message|conversation|assistant|copilot)\b/i, feature: 'AI assistant / chat', effort: 'M', priority: 'MUST', aws: ['Bedrock', 'Lambda'] },
  { re: /\b(notif|alert|remind|email)\b/i, feature: 'Notifications', effort: 'M', priority: 'NICE', aws: ['Lambda', 'SNS'] },
  { re: /\b(upload|file|image|photo|document|storage)\b/i, feature: 'File uploads & storage', effort: 'M', priority: 'NICE', aws: ['S3', 'Lambda'] },
  { re: /\b(dashboard|analytic|report|track|progress|metric)\b/i, feature: 'Dashboard & analytics', effort: 'M', priority: 'NICE', aws: ['Lambda', 'DynamoDB', 'CloudWatch'] },
  { re: /\b(payment|pay|checkout|subscription|billing)\b/i, feature: 'Payments', effort: 'L', priority: 'FUTURE', aws: ['Lambda'] },
  { re: /\b(map|location|geo|nearby)\b/i, feature: 'Maps & location', effort: 'L', priority: 'FUTURE', aws: ['Lambda'] },
  { re: /\b(social|share|community|follow|comment)\b/i, feature: 'Social / community', effort: 'L', priority: 'FUTURE', aws: ['Lambda', 'DynamoDB'] },
  { re: /\b(mobile|ios|android|app store)\b/i, feature: 'Native mobile app', effort: 'L', priority: 'FUTURE', aws: [] },
  { re: /\b(event|hackathon|internship|scholarship|opportunit)\b/i, feature: 'Opportunity listings feed', effort: 'M', priority: 'MUST', aws: ['Lambda', 'DynamoDB'] }
];

const EFFORT_HOURS = { S: 2, M: 4, L: 8 };

function uniqueBy(arr, keyFn) {
  const seen = new Set();
  return arr.filter((x) => {
    const k = keyFn(x);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function detectFeatures(text) {
  const found = [];
  for (const k of FEATURE_KEYWORDS) {
    if (k.re.test(text)) {
      found.push({ feature: k.feature, effort: k.effort, priority: k.priority, aws: k.aws });
    }
  }
  return uniqueBy(found, (f) => f.feature);
}

function estimateHours(availableTime = '') {
  const t = String(availableTime).toLowerCase();
  const m = t.match(/(\d+)/);
  const n = m ? parseInt(m[1], 10) : 24;
  if (t.includes('day') || t.includes('week')) return n * (t.includes('week') ? 40 : 8);
  return n; // assume hours
}

// ---------------------------------------------------------------------------
// IDEA ANALYSIS
// ---------------------------------------------------------------------------
export function analyzeIdea(project) {
  const idea = `${project.problem || ''} ${project.description || ''} ${project.name || ''}`.trim();
  const features = detectFeatures(idea);
  const featureCount = Math.max(features.length, 3);
  const hours = estimateHours(project.availableTime);

  // Scoring dimensions (0-100), each grounded in the input.
  const problemClarity = clamp(
    40 + (project.problem ? Math.min(project.problem.length, 200) / 4 : 0) + (project.targetUsers ? 15 : 0),
    30,
    98
  ) | 0;
  const userValue = clamp(50 + (project.targetUsers ? 25 : 0) + (features.some((f) => f.priority === 'MUST') ? 15 : 0), 30, 96) | 0;
  const technicalFeasibility = clamp(90 - Math.max(0, featureCount - 4) * 8 - (hours < 12 ? 10 : 0), 25, 95) | 0;
  const innovation = clamp(55 + (features.some((f) => f.aws.includes('Bedrock')) ? 25 : 5) + (features.length > 5 ? 5 : 0), 35, 95) | 0;
  const hackathonSuitability = clamp(85 - Math.max(0, featureCount - 4) * 9 + (hours >= 12 ? 8 : -8), 20, 95) | 0;

  const overall = Math.round(
    problemClarity * 0.2 +
      userValue * 0.25 +
      technicalFeasibility * 0.2 +
      innovation * 0.15 +
      hackathonSuitability * 0.2
  );

  const risks = [];
  const assumptions = [];

  if (featureCount > 4) {
    risks.push(`Scope is large: ${featureCount} candidate features detected. Hard to finish in ${hours}h.`);
  }
  if (hours < 12) {
    risks.push('Very limited time window — authentication + AI + persistence may not all fit.');
  }
  if (!project.targetUsers) {
    risks.push('Target users are not clearly defined, which weakens the value proposition.');
    assumptions.push('Assuming a single primary user persona for the MVP.');
  }
  if (features.some((f) => f.feature === 'Payments')) {
    risks.push('Payments add compliance + integration overhead; defer past the hackathon.');
  }
  assumptions.push('Assuming a serverless AWS stack is acceptable for cost and scale.');
  assumptions.push('Assuming read-heavy access patterns suited to DynamoDB.');

  const complexity = featureCount >= 6 ? 'High' : featureCount >= 4 ? 'Medium' : 'Low';

  const challenge =
    featureCount > 4
      ? `This idea contains too many features for a ${hours}-hour build. I recommend reducing the MVP from ${featureCount} features to 4 that directly prove the core value.`
      : `The scope looks realistic for ${hours}h. Focus relentlessly on the ${Math.min(featureCount, 4)} must-have features and resist adding more.`;

  return {
    problemDefinition:
      project.problem ||
      `Users struggle with a real, repeated pain around ${project.name || 'this domain'} and lack a fast, guided path to a solution.`,
    targetUsers: project.targetUsers || 'Primary end users in the stated domain (define this precisely to strengthen the pitch).',
    painPoints: [
      'The current process is slow, manual, or fragmented.',
      'Relevant information is scattered across many sources.',
      'Users lack guidance on what to do next.'
    ],
    proposedSolution: `${project.name || 'The product'} centralizes the workflow and layers an AI teammate on top to guide users to an outcome faster.`,
    uniqueValueProposition: features.some((f) => f.aws.includes('Bedrock'))
      ? 'An AI agent that reasons about the user’s specific situation, not a static tool.'
      : 'A focused, opinionated workflow that removes friction from the core task.',
    expectedImpact: 'Reduces time-to-outcome and increases completion rate for the core task.',
    technicalComplexity: complexity,
    hackathonFeasibility: hackathonSuitability >= 60 ? 'Feasible if scope is disciplined' : 'At risk — scope must be cut',
    risks,
    assumptions,
    recommendedMvpScope: `${Math.min(Math.max(features.filter((f) => f.priority === 'MUST').length, 3), 4)} must-have features that demonstrate the core loop end-to-end.`,
    challenge,
    score: {
      problemClarity,
      userValue,
      technicalFeasibility,
      innovation,
      hackathonSuitability,
      overall
    },
    detectedFeatures: features
  };
}

// ---------------------------------------------------------------------------
// MVP GENERATION
// ---------------------------------------------------------------------------
export function generateMvp(project, { reduce = false } = {}) {
  const idea = `${project.problem || ''} ${project.description || ''}`.trim();
  let features = detectFeatures(idea);

  // Always ensure a spine of core features exists.
  if (!features.some((f) => f.feature.includes('authentication'))) {
    features.unshift({ feature: 'User authentication', effort: 'M', priority: 'MUST', aws: ['Cognito', 'Lambda'] });
  }
  if (!features.some((f) => f.priority === 'MUST')) {
    features.unshift({ feature: 'Core data workflow', effort: 'M', priority: 'MUST', aws: ['Lambda', 'DynamoDB'] });
  }

  const detail = (f, i) => ({
    id: `f${i + 1}`,
    name: f.feature,
    description: `${f.feature} — supports the core user journey for ${project.name || 'the product'}.`,
    priority: f.priority,
    effort: f.effort,
    effortHours: EFFORT_HOURS[f.effort] || 4,
    dependencies: f.feature.includes('authentication') ? [] : ['User authentication'],
    aws: f.aws
  });

  let detailed = features.map(detail);

  if (reduce) {
    // Reduce to the smallest useful MVP: keep MUST features, cap at 4, cheapest first.
    detailed = detailed
      .filter((f) => f.priority === 'MUST')
      .sort((a, b) => a.effortHours - b.effortHours)
      .slice(0, 4);
    if (detailed.length < 3) {
      // pad with the cheapest NICE features promoted to MUST
      const promote = features
        .map(detail)
        .filter((f) => f.priority !== 'MUST')
        .sort((a, b) => a.effortHours - b.effortHours)
        .slice(0, 3 - detailed.length)
        .map((f) => ({ ...f, priority: 'MUST' }));
      detailed = [...detailed, ...promote];
    }
  }

  const mustHave = detailed.filter((f) => f.priority === 'MUST');
  const niceToHave = detailed.filter((f) => f.priority === 'NICE');
  const future = detailed.filter((f) => f.priority === 'FUTURE');

  const buildHoursLow = mustHave.reduce((s, f) => s + f.effortHours, 0);
  const buildHoursHigh = buildHoursLow + niceToHave.reduce((s, f) => s + f.effortHours, 0);

  return {
    reduced: reduce,
    mustHave,
    niceToHave,
    future,
    summary: {
      mustHaveCount: mustHave.length,
      estimatedBuildTime: `${buildHoursLow}–${Math.max(buildHoursHigh, buildHoursLow + 4)} hours`
    }
  };
}

// ---------------------------------------------------------------------------
// AWS ARCHITECTURE
// ---------------------------------------------------------------------------
export function generateArchitecture(project, mvp) {
  const features = (mvp?.mustHave || []).concat(mvp?.niceToHave || []);
  const needs = new Set(features.flatMap((f) => f.aws || []));
  const usesAuth = features.some((f) => (f.name || '').toLowerCase().includes('auth')) || needs.has('Cognito');
  const usesAi = needs.has('Bedrock') || /ai|assistant|recommend/i.test(project.problem || '');
  const usesFiles = needs.has('S3') || /upload|file|image|document/i.test(project.problem || '');

  const services = [
    {
      name: 'Amazon Bedrock / Nova',
      purpose: 'AI reasoning: idea analysis, mentoring, architecture advice, reviews, and content generation.',
      why: 'Managed foundation models with no infrastructure to run; Nova is cost-effective for text reasoning.',
      alternative: 'Self-hosted open model on SageMaker/EC2.',
      tradeoff: 'Less control over the model vs. far less operational overhead.'
    },
    {
      name: 'AWS Lambda',
      purpose: 'Stateless backend logic and orchestration for every API route.',
      why: 'Pay-per-request, scales to zero, ideal for hackathon traffic and Free Tier.',
      alternative: 'Containers on ECS/Fargate.',
      tradeoff: 'Cold starts vs. zero idle cost and no server management.'
    },
    {
      name: 'Amazon API Gateway',
      purpose: 'Secure HTTPS API layer between the frontend and Lambda.',
      why: 'Handles routing, throttling, CORS, and auth at the edge.',
      alternative: 'Lambda Function URLs.',
      tradeoff: 'Slightly more setup vs. throttling, usage plans, and validation built in.'
    },
    {
      name: 'Amazon DynamoDB',
      purpose: 'Project memory: stores project state, MVP, tasks, decisions, and AI outputs.',
      why: 'Single-digit-ms reads/writes, serverless, Free Tier friendly for key-value/document access.',
      alternative: 'Amazon RDS (PostgreSQL).',
      tradeoff: 'Limited ad-hoc querying vs. effortless scale and no connection management.'
    }
  ];

  if (usesFiles) {
    services.push({
      name: 'Amazon S3',
      purpose: 'Store project artifacts and generated files (demo scripts, exports).',
      why: 'Cheap, durable object storage; can also host the static frontend.',
      alternative: 'Store blobs in DynamoDB (not recommended).',
      tradeoff: 'Eventual consistency on overwrite vs. unlimited durable storage.'
    });
  }
  if (usesAuth) {
    services.push({
      name: 'Amazon Cognito',
      purpose: 'User sign-up / sign-in and issuing tokens the API validates.',
      why: 'Managed auth so you never store passwords yourself.',
      alternative: 'Roll-your-own JWT auth in Lambda.',
      tradeoff: 'Learning curve vs. secure, standards-based auth out of the box.'
    });
  }
  services.push({
    name: 'Amazon CloudWatch',
    purpose: 'Logs, metrics, and troubleshooting for Lambda and API Gateway.',
    why: 'Automatic Lambda logging plus custom metrics/alarms.',
    alternative: 'Third-party observability (Datadog).',
    tradeoff: 'Basic dashboards vs. no extra vendor or cost.'
  });
  services.push({
    name: 'Amazon CloudFront',
    purpose: 'CDN for the frontend for low-latency global delivery.',
    why: 'Caches static assets close to users and terminates TLS.',
    alternative: 'Serve directly from S3.',
    tradeoff: 'Extra config vs. faster global loads and HTTPS.'
  });

  // ASCII data-flow diagram
  const bottomRow = ['DynamoDB', usesFiles ? 'S3' : null, 'Bedrock/Nova'].filter(Boolean).join('   ');
  const diagram = [
    '            USER',
    '              |',
    '         FRONTEND (S3 + CloudFront)',
    '              |',
    usesAuth ? '        Cognito (auth)' : null,
    usesAuth ? '              |' : null,
    '        API GATEWAY',
    '              |',
    '           LAMBDA',
    '        /     |     \\\\',
    `     ${bottomRow}`,
    '                     |',
    '               AI RESPONSES',
    '              |',
    '          CloudWatch (logs/metrics)'
  ]
    .filter((l) => l !== null)
    .join('\n');

  return { services, diagram, usesAuth, usesAi, usesFiles };
}

// ---------------------------------------------------------------------------
// TASK GENERATION
// ---------------------------------------------------------------------------
export function generateTasks(project, mvp, architecture) {
  const tasks = [
    { name: 'Scaffold frontend', description: 'Set up the web app shell, routing, and layout.', priority: 'HIGH', estimateHours: 3, dependencies: [] },
    { name: 'Configure API Gateway', description: 'Create the HTTPS API and routes to Lambda.', priority: 'HIGH', estimateHours: 2, dependencies: ['Scaffold frontend'] },
    { name: 'Create Lambda backend', description: 'Implement handlers and wire in the AI service.', priority: 'HIGH', estimateHours: 4, dependencies: ['Configure API Gateway'] },
    { name: 'Configure DynamoDB', description: 'Create the project table and persistence layer.', priority: 'HIGH', estimateHours: 2, dependencies: ['Create Lambda backend'] }
  ];

  if (architecture?.usesAi) {
    tasks.push({ name: 'Integrate Bedrock/Nova', description: 'Connect the AI reasoning calls with fallback handling.', priority: 'HIGH', estimateHours: 3, dependencies: ['Create Lambda backend'] });
  }
  if (architecture?.usesAuth) {
    tasks.push({ name: 'Set up Cognito auth', description: 'Sign-up/sign-in and API token validation.', priority: 'MEDIUM', estimateHours: 3, dependencies: ['Configure API Gateway'] });
  }

  for (const f of mvp?.mustHave || []) {
    tasks.push({
      name: `Build: ${f.name}`,
      description: f.description,
      priority: 'HIGH',
      estimateHours: f.effortHours,
      dependencies: ['Create Lambda backend']
    });
  }

  tasks.push({ name: 'Testing', description: 'Unit + end-to-end test of the core workflow.', priority: 'MEDIUM', estimateHours: 3, dependencies: [] });
  tasks.push({ name: 'Deployment', description: 'Deploy frontend + backend to AWS.', priority: 'MEDIUM', estimateHours: 2, dependencies: ['Testing'] });

  return tasks.map((t, i) => ({
    id: `t${i + 1}`,
    order: i + 1,
    status: 'TODO',
    ...t
  }));
}

// ---------------------------------------------------------------------------
// PROGRESS
// ---------------------------------------------------------------------------
export function computeProgress(project) {
  const tasks = project.tasks || [];
  const done = tasks.filter((t) => t.status === 'DONE').length;
  const inProgress = tasks.filter((t) => t.status === 'IN_PROGRESS');
  const taskPct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  const stages = {
    Idea: !!project.analysis,
    MVP: !!project.mvp,
    Architecture: !!project.architecture,
    Development: taskPct,
    Testing: tasks.some((t) => /test/i.test(t.name) && t.status === 'DONE'),
    Deployment: tasks.some((t) => /deploy/i.test(t.name) && t.status === 'DONE'),
    Demo: !!project.demo
  };

  // Overall = weighted blend of stage completion.
  const stageWeights = [
    project.analysis ? 12 : 0,
    project.mvp ? 12 : 0,
    project.architecture ? 12 : 0,
    Math.round(taskPct * 0.4), // development is 40 pts
    stages.Testing ? 8 : 0,
    stages.Deployment ? 8 : 0,
    project.demo ? 8 : 0
  ];
  const overall = clamp(stageWeights.reduce((a, b) => a + b, 0), 0, 100);

  const remainingHours = tasks
    .filter((t) => t.status !== 'DONE')
    .reduce((s, t) => s + (t.estimateHours || 0), 0);

  return {
    overall,
    taskPct,
    stages,
    completedTasks: done,
    totalTasks: tasks.length,
    inProgressTasks: inProgress.map((t) => t.name),
    estimatedTimeRemaining: `${remainingHours}h`,
    remainingHours
  };
}

// ---------------------------------------------------------------------------
// AI MENTOR (agentic: observe -> analyze -> decide -> recommend)
// ---------------------------------------------------------------------------
export function mentor(project, question = '') {
  const progress = computeProgress(project);
  const hours = estimateHours(project.availableTime);
  const tasks = project.tasks || [];
  const openMust = tasks.filter((t) => t.status !== 'DONE' && t.priority === 'HIGH');
  const authTask = tasks.find((t) => /auth|cognito/i.test(t.name));
  const q = question.toLowerCase();

  let currentStatus = `MVP is ${progress.overall}% complete. ${progress.completedTasks}/${progress.totalTasks} tasks done.`;
  let problem = 'No blocking problem detected.';
  let recommendation = 'Keep executing the current task list in order.';
  let nextBestAction = openMust[0] ? openMust[0].name : 'Prepare your demo and review.';

  // Scope-creep detection.
  if (/add|more|new feature|another|mobile|extra/.test(q)) {
    if (progress.overall < 80) {
      problem = 'You are considering adding scope while the core MVP is incomplete.';
      recommendation = `You have ~${progress.remainingHours}h of planned work left and the MVP is ${progress.overall}% done. Do NOT add features. Finish the core loop first.`;
      nextBestAction = openMust[0] ? `Complete "${openMust[0].name}" before anything new.` : 'Complete testing and deployment.';
      currentStatus = `${currentStatus} Scope-creep risk detected.`;
    } else {
      recommendation = 'Core MVP is essentially done. A small, low-risk addition is acceptable if it strengthens the demo.';
    }
  } else if (authTask && authTask.status !== 'DONE') {
    problem = 'Authentication is unfinished, which blocks user-specific features.';
    recommendation = 'Complete and test authentication before building dependent features.';
    nextBestAction = 'Implement and test the authentication API.';
  } else if (progress.remainingHours > hours) {
    problem = `Planned work (${progress.remainingHours}h) exceeds available time (${hours}h).`;
    recommendation = 'Cut scope now: move NICE features to FUTURE and keep only the demo-critical path.';
    nextBestAction = 'Reduce MVP scope, then continue the highest-priority task.';
  } else if (/debug|error|stuck|blocker|not working|fail/.test(q)) {
    problem = 'You reported a blocker.';
    recommendation = 'Isolate the failing layer: check CloudWatch logs for the Lambda, verify the request/response shape, then test the AI call and DynamoDB write independently.';
    nextBestAction = 'Reproduce the error with a single API call and read the logs.';
  } else if (progress.overall >= 90) {
    problem = 'None — you are close to shipping.';
    recommendation = 'Lock scope, run the end-to-end test, generate your demo script, and rehearse the pitch.';
    nextBestAction = 'Generate the demo and pitch.';
  }

  return {
    question,
    observe: currentStatus,
    analyze: `Time available ~${hours}h, ${progress.remainingHours}h of work remaining, ${openMust.length} high-priority tasks open.`,
    decide: problem,
    currentStatus,
    problem,
    recommendation,
    nextBestAction
  };
}

// ---------------------------------------------------------------------------
// PROJECT REVIEW
// ---------------------------------------------------------------------------
export function reviewProject(project) {
  const progress = computeProgress(project);
  const arch = project.architecture;
  const usedServices = arch?.services?.length || 0;

  const functionality = clamp(40 + progress.overall * 0.5, 20, 98) | 0;
  const architecture = clamp(50 + usedServices * 6, 30, 96) | 0;
  const security = clamp((arch?.usesAuth ? 78 : 62) + (usedServices > 4 ? 6 : 0), 40, 95) | 0;
  const scalability = clamp(70 + (usedServices >= 4 ? 12 : 0), 40, 96) | 0;
  const ux = clamp(60 + (project.mvp ? 20 : 0) + (project.analysis ? 6 : 0), 40, 95) | 0;
  const innovation = clamp(60 + (arch?.usesAi ? 28 : 5), 40, 96) | 0;
  const documentation = clamp(50 + (project.demo ? 20 : 0) + (project.tasks?.length ? 10 : 0), 30, 92) | 0;

  const overall = Math.round(
    (functionality + architecture + security + scalability + ux + innovation + documentation) / 7
  );

  const improvements = [];
  if (documentation < 80) improvements.push({ priority: 1, area: 'Documentation', action: 'Complete the README and showcase doc, including the architecture diagram and env vars.' });
  if (!arch?.usesAuth) improvements.push({ priority: 2, area: 'Security', action: 'Add Cognito auth and protect user-specific endpoints.' });
  if (progress.overall < 100) improvements.push({ priority: 3, area: 'Functionality', action: `Finish the ${progress.totalTasks - progress.completedTasks} remaining tasks to complete the core loop.` });
  if (!project.demo) improvements.push({ priority: 4, area: 'Demo readiness', action: 'Generate the demo script and pitch and rehearse the 60-second flow.' });
  improvements.push({ priority: 5, area: 'Reliability', action: 'Add retries/backoff on Bedrock calls and structured error responses.' });

  return {
    scores: { functionality, architecture, security, scalability, ux, innovation, documentation, overall },
    topImprovements: improvements.sort((a, b) => a.priority - b.priority).slice(0, 5)
  };
}

// ---------------------------------------------------------------------------
// DEMO + PITCH
// ---------------------------------------------------------------------------
export function generateDemo(project) {
  const name = project.name || 'the product';
  const problem = project.problem || 'a real, repeated user pain';
  const users = project.targetUsers || 'the target users';
  const arch = project.architecture;
  const services = (arch?.services || []).map((s) => s.name).join(', ') || 'AWS serverless services';
  const mustFeatures = (project.mvp?.mustHave || []).map((f) => f.name);

  return {
    pitch30: `${name} helps ${users} who ${problem.toLowerCase().startsWith('the') ? problem : 'face ' + problem}. It uses an AI teammate on AWS to turn that problem into a working solution, fast.`,
    demoScript60: [
      `Open ${name} and enter the core problem.`,
      'Click Analyze Idea — the AI identifies the problem, users, risks, and feasibility.',
      'Click Generate MVP — the AI reduces scope to the essential features.',
      'Open Architecture — show the AWS serverless design.',
      'Open Tasks — show the generated roadmap and progress.',
      'Ask the Mentor a scope question — it pushes back and recommends the next best action.',
      'Open Review and Demo — show scores and the generated pitch.'
    ],
    presentation3min: [
      { section: 'Problem', content: problem },
      { section: 'Why it matters', content: `${users} lose time and outcomes today because the process is fragmented.` },
      { section: 'Solution', content: `${name}: ${(project.analysis?.proposedSolution) || 'a focused workflow with an AI teammate.'}` },
      { section: 'How it works', content: `Frontend -> API Gateway -> Lambda -> DynamoDB + Bedrock/Nova, with CloudWatch for observability.` },
      { section: 'AI capability', content: 'The agent observes project state and adapts its recommendations as progress changes.' },
      { section: 'AWS services', content: services },
      { section: 'Core features', content: mustFeatures.join(', ') || 'The essential MVP features.' },
      { section: 'Impact', content: project.analysis?.expectedImpact || 'Faster time-to-outcome for the core task.' }
    ],
    technicalChallenges: [
      'Keeping the AI grounded in real project state instead of generic answers.',
      'Designing a graceful fallback so the app works with or without live Bedrock access.',
      'Modeling evolving project memory in DynamoDB.'
    ],
    lessonsLearned: [
      'Scope discipline matters more than features in a hackathon.',
      'Serverless keeps cost near zero and removes ops overhead.',
      'An agent is only useful when it uses context and pushes back.'
    ],
    futureImprovements: [
      'Add Cognito-based multi-user projects.',
      'Stream AI responses for faster perceived latency.',
      'Export the plan to a real repo scaffold.'
    ],
    judgeQuestions: [
      { q: 'How is this different from a chatbot?', a: 'It maintains project state and changes its recommendations based on progress and time remaining — it drives toward shipping.' },
      { q: 'What AWS services power it?', a: services },
      { q: 'How do you keep credentials safe?', a: 'No credentials in the frontend; Lambda uses IAM roles with least privilege; secrets stay in environment/config.' },
      { q: 'What happens if Bedrock fails?', a: 'The backend falls back to a deterministic reasoning engine so the demo never breaks.' }
    ]
  };
}

export function generatePitch(project) {
  const name = project.name || 'the product';
  const problem = project.problem || 'a real user pain';
  const users = project.targetUsers || 'target users';
  const services = (project.architecture?.services || []).map((s) => s.name).slice(0, 5).join(', ') || 'AWS serverless';
  return {
    problem,
    whyItMatters: `${users} are blocked today, costing them time and missed outcomes.`,
    solution: `${name} centralizes the workflow with an AI teammate that guides users to results.`,
    howItWorks: 'A serverless AWS backend orchestrates AI reasoning and persists evolving project state.',
    aiCapability: 'The agent reasons over current context and adapts recommendations as the project changes.',
    awsArchitecture: services,
    impact: project.analysis?.expectedImpact || 'Faster, higher-quality outcomes for the core task.',
    future: 'Multi-user accounts, streaming AI, and one-click repo scaffolding.'
  };
}
