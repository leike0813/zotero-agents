// THROWAWAY revision 7: guided MCP argument, environment and authentication editors.
// This entry is built only by scripts/internal/build-builtin-agent-settings-prototype.mjs.
import { render, type ComponentChildren } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import {
  defaultPiWebSources,
  PI_WEB_SOURCE_BILLABLE,
  type PiWebSourceKind,
} from "../../shared/piWebSourceContract";

type Page = "overview" | "connections" | "mcp" | "search" | "catalog";
type Kind = "chatgpt" | "api-key" | "custom";
type Registration = {
  id: string;
  email: string;
  workspace: string;
  label: string;
  identity: string;
  signedIn: boolean;
  permission: boolean;
  welcome: boolean;
  paused: boolean;
  reauthorize: boolean;
};
type Connection = {
  id: string;
  label: string;
  kind: Kind;
  provider: string;
  modelIds: string[];
  registrationId?: string;
  keySaved: boolean;
  endpoint: string;
  dialect: string;
  needsKey: boolean;
  localApproved: boolean;
  credentialId?: string;
  serviceAccount: string;
  serviceGateway: string;
  factsIdentity?: string;
  modelTargets?: Record<string, { api: string; baseUrl: string }>;
  repairRequired?: boolean;
  discovery: "idle" | "checking" | "ready" | "failed" | "empty" | "unknown";
};
type ModelChoice = { connectionId: string; modelId: string; reasoning: string };
type Defaults = {
  common?: ModelChoice;
  conversation?: ModelChoice;
  skill?: ModelChoice;
  title?: ModelChoice;
};
type Source = {
  id: string;
  label: string;
  transport: "HTTPS" | "stdio";
  address: string;
  approved: boolean;
  enabled: boolean;
  args: string[];
  cwd: string;
  headers: Record<string, string>;
  env: Record<string, string>;
  httpAuth?: "none" | "bearer" | "api-key" | "custom";
  httpAuthHeader?: string;
};
type BindingEntry = {
  id: string;
  key: string;
  value: string;
  credentialId?: string;
};
type WebSource = {
  id: string;
  kind: PiWebSourceKind;
  label: string;
  enabled: boolean;
  credentialId?: string;
  connectionId: string;
  modelId: string;
  endpoint: string;
  executable: string;
  args: string[];
  approved: boolean;
};
type JsonEditor = {
  mode: "edit" | "import" | "export";
  text: string;
  baseline: string;
  replace: string[];
  grants: string[];
};
const newSource = (sourceId = id("source")): Source => ({
  id: sourceId,
  label: sourceId,
  transport: "HTTPS",
  address: "",
  approved: false,
  enabled: true,
  args: [],
  cwd: "",
  headers: {},
  env: {},
  httpAuth: "none",
  httpAuthHeader: "",
});
const initialWebSources = (): WebSource[] =>
  defaultPiWebSources().map((s) => ({
    ...s,
    connectionId: "",
    modelId: "",
    endpoint: "",
    executable: "",
    args: [],
    approved: false,
  }));
const sourceJson = (items: Source[]) =>
  JSON.stringify(
    {
      mcpServers: Object.fromEntries(
        items.map((s) => [
          s.id,
          {
            label: s.label,
            enabled: s.enabled,
            ...(s.transport === "stdio"
              ? {
                  command: s.address,
                  args: s.args,
                  ...(s.cwd ? { cwd: s.cwd } : {}),
                  env: Object.fromEntries(
                    Object.keys(s.env).map((key) => [key, ""]),
                  ),
                }
              : {
                  url: s.address,
                  headers: Object.fromEntries(
                    Object.keys(s.headers).map((key) => [key, ""]),
                  ),
                }),
          },
        ]),
      ),
    },
    null,
    2,
  );
function stringRecord(text: string): Record<string, string> {
  const value: unknown = JSON.parse(text);
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.values(value).some((v) => typeof v !== "string")
  )
    throw Error("请填写名称与字符串值组成的 JSON 对象");
  return value as Record<string, string>;
}
function stringArgs(text: string): string[] {
  const value: unknown = JSON.parse(text);
  if (!Array.isArray(value) || value.some((v) => typeof v !== "string"))
    throw Error("参数须为 JSON 字符串数组");
  return value;
}
function sourceAuthSelection(s: Source): {
  kind: NonNullable<Source["httpAuth"]>;
  key: string;
} {
  const authorization = Object.keys(s.headers).find(
    (key) => key.toLowerCase() === "authorization",
  );
  const apiKey = Object.keys(s.headers).find((key) =>
    ["x-api-key", "api-key"].includes(key.toLowerCase()),
  );
  const kind =
    s.httpAuth && s.httpAuth !== "none"
      ? s.httpAuth
      : authorization
        ? "custom"
        : apiKey
          ? "api-key"
          : "none";
  const key =
    s.httpAuthHeader ||
    (kind === "bearer"
      ? authorization || "Authorization"
      : kind === "api-key"
        ? apiKey || "X-API-Key"
        : kind === "custom"
          ? authorization || ""
          : "");
  return { kind, key };
}
function validSource(s: Source): boolean {
  return (
    !!s.label.trim() &&
    (s.transport === "stdio"
      ? /^(\/|[A-Za-z]:[\\/])/.test(s.address) &&
        (!s.cwd || /^(\/|[A-Za-z]:[\\/])/.test(s.cwd))
      : validEndpoint(s.address) &&
        (!isLocal(s.address) || s.approved) &&
        (s.address.startsWith("https:") || isLocal(s.address)))
  );
}
function parseSources(
  text: string,
  existing: Source[],
  grants: string[],
  preserveSecrets: boolean,
): Source[] {
  const root = JSON.parse(text);
  if (
    !root ||
    Object.keys(root).some((key) => key !== "mcpServers") ||
    !root.mcpServers ||
    typeof root.mcpServers !== "object" ||
    Array.isArray(root.mcpServers)
  )
    throw Error("请填写整份 mcpServers 对象");
  return Object.entries(root.mcpServers).map(([name, raw]) => {
    if (
      !/^[A-Za-z0-9_-]+$/.test(name) ||
      !raw ||
      typeof raw !== "object" ||
      Array.isArray(raw)
    )
      throw Error("来源名称须使用字母、数字、下划线或连字符");
    const row = raw as Record<string, unknown>;
    if (
      Object.keys(row).some(
        (key) =>
          ![
            "label",
            "enabled",
            "url",
            "command",
            "args",
            "cwd",
            "headers",
            "env",
          ].includes(key),
      )
    )
      throw Error("存在未支持的配置字段，请先检查后再保存");
    if (
      (typeof row.url === "string") === (typeof row.command === "string") ||
      (row.enabled !== undefined && typeof row.enabled !== "boolean") ||
      (row.label !== undefined && typeof row.label !== "string") ||
      (row.cwd !== undefined && typeof row.cwd !== "string")
    )
      throw Error("每个来源须选择 url 或 command，并检查字段类型");
    if (
      typeof row.url === "string"
        ? ["args", "cwd", "env"].some((key) => key in row)
        : "headers" in row
    )
      throw Error("HTTP 来源使用 headers，本机程序使用 args、cwd 与 env");
    const old = existing.find((s) => s.id === name);
    const headerValues = stringRecord(JSON.stringify(row.headers ?? {}));
    const authorization = Object.keys(headerValues).find(
      (key) => key.toLowerCase() === "authorization",
    );
    const apiKey = Object.keys(headerValues).find((key) =>
      ["x-api-key", "api-key"].includes(key.toLowerCase()),
    );
    const previousAuth =
      old && preserveSecrets ? sourceAuthSelection(old) : undefined;
    const authKind = authorization
      ? /^Bearer\s+\S/i.test(headerValues[authorization]) ||
        (!headerValues[authorization] && previousAuth?.kind === "bearer")
        ? "bearer"
        : "custom"
      : previousAuth?.kind === "api-key" && previousAuth.key in headerValues
        ? "api-key"
        : previousAuth?.kind === "custom" && previousAuth.key in headerValues
          ? "custom"
          : apiKey
            ? "api-key"
            : "none";
    const bind = (field: "headers" | "env") =>
      Object.fromEntries(
        Object.entries(stringRecord(JSON.stringify(row[field] ?? {}))).map(
          ([key, value]) => [
            key,
            value
              ? id("credential")
              : preserveSecrets
                ? old?.[field][key] || ""
                : "",
          ],
        ),
      );
    return {
      ...newSource(name),
      label: String(row.label ?? name),
      enabled: row.enabled !== false,
      transport: typeof row.command === "string" ? "stdio" : "HTTPS",
      address: String(row.command ?? row.url),
      args: stringArgs(JSON.stringify(row.args ?? [])),
      cwd: String(row.cwd ?? ""),
      headers: bind("headers"),
      env: bind("env"),
      httpAuth: typeof row.command === "string" ? "none" : authKind,
      httpAuthHeader:
        typeof row.command === "string"
          ? ""
          : authKind === "bearer"
            ? authorization
            : authKind === "api-key"
              ? previousAuth?.kind === "api-key" &&
                previousAuth.key in headerValues
                ? previousAuth.key
                : apiKey
              : authKind === "custom"
                ? authorization ||
                  (previousAuth?.kind === "custom" &&
                  previousAuth.key in headerValues
                    ? previousAuth.key
                    : "")
                : "",
      approved:
        grants.includes(name) ||
        !!(old?.approved && old.address === (row.command ?? row.url)),
    };
  });
}
type Auth = {
  requestId: string;
  ownerId: string;
  registrationId: string;
  phase: "waiting" | "exchange" | "verify" | "failed" | "expired";
};
type Leave = { kind: "close" | "cancel" | "switch"; connectionId?: string };
type TestResult = {
  requestId: string;
  fingerprint: string;
  pending: boolean;
  text: string;
  tone: string;
};
const PURPOSES: { key: keyof Defaults; label: string }[] = [
  { key: "common", label: "常用" },
  { key: "conversation", label: "会话" },
  { key: "skill", label: "工作流" },
  { key: "title", label: "标题" },
];
const KIND_LABEL = {
  chatgpt: "ChatGPT",
  "api-key": "API Key 服务",
  custom: "自定义服务",
};
const MODELS = [
  { id: "alpha", name: "示例模型 Alpha", note: "通用任务 · 支持推理" },
  { id: "beta", name: "示例模型 Beta", note: "轻量任务 · 快速响应" },
];
type PublicModel = {
  provider: string;
  id: string;
  name: string;
  api: string;
  baseUrl: string;
  availability: string;
  reasoning: string[];
  contextWindow: number;
  maxTokens: number;
  canConfigure: boolean;
  requiresServiceParameters: boolean;
};
declare const __PI_PROTOTYPE_CATALOG__: PublicModel[];
const PUBLIC_MODELS = __PI_PROTOTYPE_CATALOG__;
const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google Gemini",
  deepseek: "DeepSeek",
  openrouter: "OpenRouter",
  groq: "Groq",
  xai: "xAI",
  minimax: "MiniMax",
  "minimax-cn": "MiniMax · 中国",
  moonshotai: "Moonshot AI",
  "moonshotai-cn": "Moonshot AI · 中国",
  "kimi-coding": "Kimi Coding",
  "amazon-bedrock": "Amazon Bedrock",
  "google-vertex": "Google Vertex AI",
  "github-copilot": "GitHub Copilot",
  "azure-openai-responses": "Azure OpenAI",
  mistral: "Mistral",
  nvidia: "NVIDIA NIM",
  zai: "Z.AI",
  "zai-coding-cn": "Z.AI · 中国",
  together: "Together AI",
  fireworks: "Fireworks",
  cerebras: "Cerebras",
  huggingface: "Hugging Face",
  baseten: "Baseten",
  "vercel-ai-gateway": "Vercel AI Gateway",
  "cloudflare-ai-gateway": "Cloudflare AI Gateway",
  "cloudflare-workers-ai": "Cloudflare Workers AI",
  "ant-ling": "Ant Ling",
  meta: "Meta",
  opencode: "OpenCode Zen",
  "opencode-go": "OpenCode Go",
  "qwen-token-plan": "Qwen Token Plan",
  "qwen-token-plan-cn": "Qwen Token Plan · 中国",
  "qwen-token-plan-individual": "Qwen Token Plan · Individual",
  radius: "Radius",
  xiaomi: "Xiaomi MiMo",
  "xiaomi-token-plan-ams": "Xiaomi MiMo Token Plan · AMS",
  "xiaomi-token-plan-cn": "Xiaomi MiMo Token Plan · 中国",
  "xiaomi-token-plan-sgp": "Xiaomi MiMo Token Plan · SGP",
};
function providerLabel(id: string) {
  return PROVIDER_LABELS[id] || id;
}
const PUBLIC_PROVIDERS = [...new Set(PUBLIC_MODELS.map((m) => m.provider))]
  .sort()
  .map((id) => ({
    id,
    label: providerLabel(id),
    models: PUBLIC_MODELS.filter((m) => m.provider === id),
    canConfigure: PUBLIC_MODELS.some(
      (m) => m.provider === id && m.canConfigure,
    ),
    needsParameters: PUBLIC_MODELS.some(
      (m) => m.provider === id && m.requiresServiceParameters,
    ),
  }));
function providerProblem(provider: string) {
  if (provider === "github-copilot")
    return "此服务商的登录方式与请求要求尚未适配";
  if (provider === "nvidia") return "此服务商的请求要求尚未适配";
  return "此服务商的接口或认证方式尚未适配";
}
function resolvedEndpoint(c: Connection) {
  if (c.provider === "cloudflare-ai-gateway")
    return `https://gateway.ai.cloudflare.com/v1/${encodeURIComponent(c.serviceAccount)}/${encodeURIComponent(c.serviceGateway)}`;
  if (c.provider === "cloudflare-workers-ai")
    return `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(c.serviceAccount)}/ai/v1`;
  return c.endpoint;
}
function modelTarget(c: Connection, modelId: string) {
  const model = PUBLIC_MODELS.find(
    (m) => m.provider === c.provider && m.id === modelId,
  );
  if (!model) return { api: c.dialect, baseUrl: c.endpoint };
  return {
    api: model.api,
    baseUrl: model.baseUrl
      .replace(
        /(?:\{|%7B)CLOUDFLARE_ACCOUNT_ID(?:\}|%7D)/gi,
        encodeURIComponent(c.serviceAccount),
      )
      .replace(
        /(?:\{|%7B)CLOUDFLARE_GATEWAY_ID(?:\}|%7D)/gi,
        encodeURIComponent(c.serviceGateway),
      ),
  };
}
function draftFields(c: Connection) {
  return JSON.stringify([
    c.label,
    c.provider,
    c.registrationId,
    c.endpoint,
    c.dialect,
    c.needsKey,
    c.localApproved,
    c.serviceAccount,
    c.serviceGateway,
  ]);
}
function modelsFor(c: Connection) {
  if (c.kind !== "api-key")
    return MODELS.filter((m) => c.modelIds.includes(m.id)).map((m) => ({
      ...m,
      reasoning: m.id === "alpha" ? ["low", "medium", "high"] : [],
    }));
  return PUBLIC_MODELS.filter(
    (m) => m.provider === c.provider && c.modelIds.includes(m.id),
  ).map((m) => ({
    id: m.id,
    name: m.name,
    note: `上下文 ${m.contextWindow.toLocaleString()} · 输出上限 ${m.maxTokens.toLocaleString()}`,
    reasoning: m.reasoning.filter((level) => level !== "off"),
  }));
}
let nextId = 10;
const id = (prefix: string) => `${prefix}-${++nextId}`;
const baseConnection = (kind: Kind): Connection => ({
  id: id("connection"),
  label:
    kind === "chatgpt"
      ? "我的 ChatGPT"
      : kind === "api-key"
        ? "我的 API 服务"
        : "本地模型服务",
  kind,
  provider: "openai",
  modelIds: [],
  keySaved: false,
  endpoint: kind === "custom" ? "http://localhost:8000/v1" : "",
  dialect: "Responses",
  needsKey: kind !== "custom",
  localApproved: false,
  serviceAccount: "",
  serviceGateway: "",
  discovery: "idle",
});
const reg = (
  key = "registration-personal",
  workspace = "个人空间",
): Registration => ({
  id: key,
  email: "reader@example.test",
  workspace,
  label: workspace,
  identity: `${key}/identity-1`,
  signedIn: true,
  permission: true,
  welcome: true,
  paused: false,
  reauthorize: false,
});
function seed() {
  const registrations = [reg(), reg("registration-research", "研究空间")];
  const connections: Connection[] = [
    {
      ...baseConnection("chatgpt"),
      id: "chatgpt-personal",
      label: "ChatGPT · 个人",
      registrationId: registrations[0].id,
      modelIds: ["alpha", "beta"],
      factsIdentity: registrations[0].identity,
      discovery: "ready",
    },
    {
      ...baseConnection("chatgpt"),
      id: "chatgpt-research",
      label: "ChatGPT · 研究",
      registrationId: registrations[1].id,
      modelIds: ["alpha", "beta"],
      factsIdentity: registrations[1].identity,
      discovery: "ready",
    },
    {
      ...baseConnection("api-key"),
      id: "api-service",
      label: "OpenAI API",
      keySaved: true,
      credentialId: "key-demo",
      modelIds: PUBLIC_MODELS.filter(
        (m) => m.provider === "openai" && m.canConfigure,
      )
        .slice(0, 2)
        .map((m) => m.id),
      discovery: "ready",
    },
  ];
  const defaults: Defaults = {
    common: {
      connectionId: connections[0].id,
      modelId: "alpha",
      reasoning: "medium",
    },
  };
  return { registrations, connections, defaults };
}
function connectionState(c: Connection, registrations: Registration[]) {
  if (c.repairRequired)
    return { label: "连接目标待确认", tone: "warning", ready: false };
  if (c.kind === "chatgpt") {
    const r = registrations.find((entry) => entry.id === c.registrationId);
    if (!r?.signedIn) return { label: "未登录", tone: "warning", ready: false };
    if (r.reauthorize)
      return { label: "需重新授权", tone: "warning", ready: false };
    if (!r.permission)
      return { label: "缺少方案权限", tone: "warning", ready: false };
    if (!r.welcome)
      return { label: "待确认使用说明", tone: "warning", ready: false };
    if (r.paused) return { label: "额度暂停", tone: "warning", ready: false };
    if (c.factsIdentity !== r.identity)
      return { label: "待获取此账户模型", tone: "warning", ready: false };
  } else {
    if (c.needsKey && !c.keySaved)
      return { label: "需要 API Key", tone: "warning", ready: false };
    if (c.kind === "custom" && !c.localApproved && isLocal(c.endpoint))
      return { label: "待批准本地连接", tone: "warning", ready: false };
  }
  if (c.discovery === "idle")
    return { label: "待获取模型", tone: "warning", ready: false };
  if (c.discovery === "failed" || c.discovery === "checking")
    return {
      label:
        c.discovery === "failed" ? "刷新失败 · 保留已知模型" : "正在刷新模型",
      tone: "warning",
      ready: c.modelIds.length > 0,
    };
  if (c.discovery === "empty")
    return { label: "账户未返回模型", tone: "warning", ready: false };
  if (c.discovery === "unknown")
    return { label: "模型能力待确认", tone: "warning", ready: false };
  return { label: "可使用", tone: "success", ready: true };
}
function isLocal(value: string) {
  return /localhost|127\.0\.0\.1|\[::1\]/i.test(value);
}
function validEndpoint(value: string) {
  try {
    const url = new URL(value);
    return (
      ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}
function Button(p: {
  children: ComponentChildren;
  onClick?: () => void;
  primary?: boolean;
  danger?: boolean;
  disabled?: boolean;
  small?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={p.title}
      class={`button${p.primary ? " primary" : ""}${p.danger ? " danger" : ""}${p.small ? " small" : ""}`}
      disabled={p.disabled}
      onClick={p.onClick}
    >
      {p.children}
    </button>
  );
}
function Badge(p: { children: ComponentChildren; tone?: string }) {
  return (
    <span class={`zs-badge zs-badge--${p.tone || "muted"}`}>{p.children}</span>
  );
}
function Choice(p: {
  label: string;
  value: string;
  options: { value: string; label: string; disabled?: boolean }[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div class="choice">
      <button
        type="button"
        class="button choice-trigger"
        aria-label={p.label}
        aria-expanded={open}
        disabled={p.disabled}
        onClick={() => setOpen(!open)}
      >
        <span>
          {p.options.find((o) => o.value === p.value)?.label || "请选择"}
        </span>
        <span aria-hidden="true">⌄</span>
      </button>
      {open && (
        <div role="listbox" aria-label={p.label} class="choice-menu">
          {p.options.map((o) => (
            <button
              type="button"
              role="option"
              key={o.value}
              disabled={o.disabled}
              aria-selected={o.value === p.value}
              onClick={() => {
                p.onChange(o.value);
                setOpen(false);
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
function Field(p: {
  label: string;
  value: string;
  onInput: (value: string) => void;
  type?: string;
  help?: string;
  placeholder?: string;
  ariaLabel?: string;
}) {
  return (
    <label class="field">
      <span>{p.label}</span>
      <input
        aria-label={p.ariaLabel || p.label}
        type={p.type || "text"}
        value={p.value}
        onInput={(e) => p.onInput(e.currentTarget.value)}
        autocomplete="off"
        placeholder={p.placeholder}
      />
      {p.help && <small>{p.help}</small>}
    </label>
  );
}
function BindingEntries(p: {
  label: string;
  addLabel: string;
  entries: BindingEntry[];
  onChange: (update: (items: BindingEntry[]) => BindingEntry[]) => void;
}) {
  return (
    <section class="small-stack binding-editor">
      <div class="row spread wrap">
        <strong>{p.label}</strong>
        <Button
          small
          onClick={() =>
            p.onChange((items) => [
              ...items,
              { id: id("entry"), key: "", value: "" },
            ])
          }
        >
          {p.addLabel}
        </Button>
      </div>
      {!p.entries.length && (
        <small class="muted">尚未添加，可按需添加条目。</small>
      )}
      {p.entries.map((entry, index) => (
        <div key={entry.id} class="binding-entry">
          <Field
            label="名称"
            ariaLabel={`${p.label}${index + 1}名称`}
            value={entry.key}
            placeholder="名称"
            onInput={(key) =>
              p.onChange((items) =>
                items.map((item) =>
                  item.id === entry.id ? { ...item, key } : item,
                ),
              )
            }
          />
          <Field
            label="值"
            ariaLabel={`${p.label}${index + 1}值`}
            value={entry.value}
            type="password"
            placeholder={entry.credentialId ? "已保存，留空保留" : "填写值"}
            onInput={(value) =>
              p.onChange((items) =>
                items.map((item) =>
                  item.id === entry.id ? { ...item, value } : item,
                ),
              )
            }
          />
          <Button
            small
            onClick={() =>
              p.onChange((items) =>
                items.filter((item) => item.id !== entry.id),
              )
            }
          >
            移除条目 {index + 1}
          </Button>
        </div>
      ))}
    </section>
  );
}
function Header(p: {
  title: string;
  description: string;
  action?: ComponentChildren;
}) {
  return (
    <header class="page-header">
      <div class="row spread">
        <h2>{p.title}</h2>
        {p.action}
      </div>
      <p>{p.description}</p>
    </header>
  );
}
function Modal(p: {
  title: string;
  children: ComponentChildren;
  footer?: ComponentChildren;
  wide?: boolean;
}) {
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    document
      .querySelector<HTMLElement>("[role=dialog] button, [role=dialog] input")
      ?.focus();
    const trap = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const nodes = Array.from(
        document.querySelectorAll<HTMLElement>(
          "[role=dialog] button:not(:disabled), [role=dialog] input:not(:disabled), [role=dialog] textarea:not(:disabled), [role=dialog] select:not(:disabled), [role=dialog] a",
        ),
      );
      const first = nodes[0],
        last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", trap);
    return () => {
      document.removeEventListener("keydown", trap);
      before?.focus();
    };
  }, []);
  return (
    <div class="modal-overlay">
      <section
        role="dialog"
        aria-modal="true"
        aria-label={p.title}
        class={`modal${p.wide ? " wide" : ""}`}
      >
        <header class="modal-header">
          <h3>{p.title}</h3>
        </header>
        <div class="modal-body stack">{p.children}</div>
        {p.footer && <footer class="modal-footer row wrap">{p.footer}</footer>}
      </section>
    </div>
  );
}
function App() {
  const [page, setPage] = useState<Page>("overview");
  const [opened, setOpened] = useState(true);
  const [compact, setCompact] = useState(false);
  const [dark, setDark] = useState(false);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [defaults, setDefaults] = useState<Defaults>({});
  const [modelReasoning, setModelReasoning] = useState<Record<string, string>>(
    {},
  );
  const [selected, setSelected] = useState("");
  const [editing, setEditing] = useState<Connection | null>(null);
  const [secret, setSecret] = useState("");
  const [auth, setAuth] = useState<Auth | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [status, setStatus] = useState("尚未添加模型连接");
  const [scenario, setScenario] = useState("empty");
  const [testResult, setTestResult] = useState<Record<string, TestResult>>({});
  const [requestOutcome, setRequestOutcome] = useState("completed");
  const [saveOutcome, setSaveOutcome] = useState("success");
  const [discoveryOutcome, setDiscoveryOutcome] = useState("ready");
  const [revocationOutcome, setRevocationOutcome] = useState("unknown");
  const [pendingSave, setPendingSave] = useState("");
  const [leave, setLeave] = useState<Leave | null>(null);
  const [baseline, setBaseline] = useState("");
  const [deleteModel, setDeleteModel] = useState<{
    connection: Connection;
    modelId: string;
  } | null>(null);
  const [authRemoval, setAuthRemoval] = useState<{
    registration: Registration;
    remove: boolean;
  } | null>(null);
  const [testTarget, setTestTarget] = useState<{
    connection: Connection;
    modelId: string;
  } | null>(null);
  const [discardedAuth, setDiscardedAuth] = useState<Auth | null>(null);
  const [acceptRepair, setAcceptRepair] = useState(false);
  const [registrationLabel, setRegistrationLabel] = useState("");
  const epoch = useRef(0);
  const discoveryFlights = useRef(new Map<string, string>());
  const latest = useRef({
    connections,
    registrations,
    defaults,
    modelReasoning,
    editing,
    opened,
  });
  latest.current = {
    connections,
    registrations,
    defaults,
    modelReasoning,
    editing,
    opened,
  };
  const [sources, setSources] = useState<Source[]>([]);
  const [sourceDraft, setSourceDraft] = useState<Source | null>(null);
  const [sourceEnv, setSourceEnv] = useState<BindingEntry[]>([]);
  const [sourceHeaders, setSourceHeaders] = useState<BindingEntry[]>([]);
  const [sourceAuth, setSourceAuth] =
    useState<NonNullable<Source["httpAuth"]>>("none");
  const [sourceApiHeader, setSourceApiHeader] = useState("X-API-Key");
  const [sourceCustomHeader, setSourceCustomHeader] = useState("");
  const [sourceToken, setSourceToken] = useState("");
  const [sourceEntryBaseline, setSourceEntryBaseline] = useState("");
  const [sourceBaseline, setSourceBaseline] = useState("");
  const [jsonEditor, setJsonEditor] = useState<JsonEditor | null>(null);
  const [webSources, setWebSources] = useState<WebSource[]>(initialWebSources);
  const [searchDraft, setSearchDraft] = useState<WebSource | null>(null);
  const [searchSecret, setSearchSecret] = useState("");
  const [searchArgs, setSearchArgs] = useState("[]");
  const [searchBaseline, setSearchBaseline] = useState("");
  const [toolLeave, setToolLeave] = useState<"close" | "cancel" | null>(null);
  const [deleteSource, setDeleteSource] = useState<Source | null>(null);
  const [sourceTestTarget, setSourceTestTarget] = useState<
    Source | WebSource | null
  >(null);
  const [toolTests, setToolTests] = useState<Record<string, TestResult>>({});
  const toolCurrent = useRef({ sources, webSources });
  toolCurrent.current = { sources, webSources };
  const [maintenanceOutcome, setMaintenanceOutcome] = useState("success");
  const [overlayOutcome, setOverlayOutcome] = useState("valid");
  const [diagnosticOutcome, setDiagnosticOutcome] = useState("saved");
  const [maintenanceStatus, setMaintenanceStatus] = useState<
    Record<string, string>
  >({});
  const [autoUpdate, setAutoUpdate] = useState(true);
  const [catalogVersion, setCatalogVersion] = useState(1);
  const [previousCatalog, setPreviousCatalog] = useState<number | null>(null);
  const [overlay, setOverlay] = useState(false);
  const [modelOwner, setModelOwner] = useState<Connection | null>(null);
  const [modelQuery, setModelQuery] = useState("");
  const [modelPage, setModelPage] = useState(0);
  const [catalogProvider, setCatalogProvider] = useState("");
  const [catalogQuery, setCatalogQuery] = useState("");
  const [catalogPageIndex, setCatalogPageIndex] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<Connection | null>(null);
  const chosen = connections.find((c) => c.id === selected) || connections[0];
  const readyConnections = connections.filter(
    (c) => connectionState(c, registrations).ready,
  );
  const hasDefault =
    !!defaults.common &&
    readyConnections.some((c) => c.id === defaults.common?.connectionId);

  useEffect(() => {
    document.documentElement.dataset.zsTheme = dark ? "dark" : "light";
  }, [dark]);
  function scenarioLoad(value: string) {
    epoch.current++;
    discoveryFlights.current.clear();
    setLeave(null);
    setPendingSave("");
    setDeleteModel(null);
    setAuthRemoval(null);
    setTestTarget(null);
    setDiscardedAuth(null);
    setSaveOutcome("success");
    setDiscoveryOutcome("ready");
    setScenario(value);
    setEditing(null);
    setAuth(null);
    setAddOpen(false);
    setSecret("");
    setDeleteTarget(null);
    setModelOwner(null);
    setSourceDraft(null);
    setJsonEditor(null);
    setSearchDraft(null);
    setSourceEnv([]);
    setSourceHeaders([]);
    setSourceToken("");
    setSearchSecret("");
    setToolLeave(null);
    setDeleteSource(null);
    setSourceTestTarget(null);
    setToolTests({});
    setWebSources(initialWebSources());
    setMaintenanceOutcome("success");
    setOverlayOutcome("valid");
    setDiagnosticOutcome("saved");
    setMaintenanceStatus({});
    setOverlay(false);
    setCatalogVersion(1);
    setPreviousCatalog(null);
    setAutoUpdate(true);
    setTestResult({});
    setOpened(true);
    const s = seed();
    if (value === "empty") {
      s.connections = [];
      s.registrations = [];
      s.defaults = {};
    } else if (value !== "multi") {
      s.connections = s.connections.slice(0, 1);
      s.registrations = s.registrations.slice(0, 1);
      if (value === "permission") s.registrations[0].permission = false;
      if (value === "welcome") s.registrations[0].welcome = false;
      if (value === "paused") s.registrations[0].paused = true;
      if (value === "reauthorize") s.registrations[0].reauthorize = true;
      if (value === "signedout") s.registrations[0].signedIn = false;
      if (value === "discovery") s.connections[0].discovery = "failed";
      if (value === "unknown") s.connections[0].discovery = "unknown";
      if (value === "empty-models") s.connections[0].discovery = "empty";
      if (value === "repair") s.connections[0].repairRequired = true;
      if (value === "no-default") s.defaults = {};
    }
    setConnections(s.connections);
    setRegistrations(s.registrations);
    setDefaults(s.defaults);
    setModelReasoning({});
    setSelected(s.connections[0]?.id || "");
    setPage(value === "empty" ? "overview" : "connections");
    setSources(
      value === "empty"
        ? []
        : [
            {
              ...newSource("source-demo"),
              label: "研究资料工具",
              address: "https://tools.example.test/mcp",
            },
          ],
    );
    setStatus(value === "empty" ? "尚未添加模型连接" : "已载入连接");
  }
  function patchConnection(key: string, patch: Partial<Connection>) {
    setConnections((items) =>
      items.map((c) => (c.id === key ? { ...c, ...patch } : c)),
    );
    setEditing((current) =>
      current?.id === key ? { ...current, ...patch } : current,
    );
  }
  function patchRegistration(key: string, patch: Partial<Registration>) {
    setRegistrations((items) =>
      items.map((r) => (r.id === key ? { ...r, ...patch } : r)),
    );
  }
  function addConnection(kind: Kind, provider = "openai") {
    const draft = {
      ...baseConnection(kind),
      provider,
      label:
        kind === "api-key"
          ? providerLabel(provider)
          : baseConnection(kind).label,
    };
    setEditing(draft);
    setRegistrationLabel("");
    setBaseline(draftFields(draft));
    setSecret("");
    setAddOpen(false);
  }
  function beginLogin(c: Connection) {
    if (auth) return;
    setAuth({
      requestId: id("login"),
      ownerId: c.id,
      registrationId: c.registrationId || id("registration"),
      phase: "waiting",
    });
    setStatus("等待浏览器登录；可取消本次登录");
  }
  function completeLogin(outcome: string) {
    if (!auth) return;
    if (auth.phase === "failed" || auth.phase === "expired") {
      setStatus("此授权请求已经结束；请重新登录，迟到结果不会写入");
      return;
    }
    if (outcome === "failed" || outcome === "expired") {
      setAuth({ ...auth, phase: outcome });
      setStatus(
        outcome === "expired"
          ? "登录已超时，可重新登录"
          : "本次登录失败，可重新登录",
      );
      return;
    }
    const previous = registrations.find(
      (entry) => entry.id === auth.registrationId,
    );
    const r = {
      ...reg(
        auth.registrationId,
        previous?.workspace ||
          (registrations.some((r) => r.workspace === "个人空间")
            ? "研究空间"
            : "个人空间"),
      ),
      welcome: previous?.welcome || false,
      permission: outcome !== "permission",
      paused: previous?.paused || false,
      label: previous?.label || previous?.workspace || "我的 ChatGPT 注册",
    };
    setRegistrations((items) => [
      ...items.filter((entry) => entry.id !== r.id),
      r,
    ]);
    patchConnection(auth.ownerId, {
      registrationId: r.id,
      discovery: "checking",
    });
    const owner =
      editing?.id === auth.ownerId
        ? editing
        : connections.find((c) => c.id === auth.ownerId);
    if (owner) refreshModels({ ...owner, registrationId: r.id }, r);
    setAuth(null);
    setRegistrationLabel(r.label);
    setStatus(
      outcome === "permission"
        ? "已登录，但尚未获得 ChatGPT 方案权限"
        : "已登录，请确认方案使用说明",
    );
  }
  function cancelLogin() {
    if (!auth) return;
    setDiscardedAuth(auth);
    setAuth(null);
    setStatus("登录已取消，连接配置保留");
  }
  function discardEditor() {
    if (editing && auth?.ownerId === editing.id) cancelLogin();
    setEditing(null);
    setSecret("");
  }
  function editConnection(c: Connection) {
    setAcceptRepair(false);
    setRegistrationLabel(
      registrations.find((r) => r.id === c.registrationId)?.label || "",
    );
    setEditing({ ...c });
    setBaseline(draftFields(c));
    setSecret("");
  }
  function queueSave(label: string, commit: () => void) {
    if (pendingSave) return;
    const generation = epoch.current;
    const success = saveOutcome === "success";
    setPendingSave(label);
    setStatus(`正在保存${label}…`);
    setTimeout(() => {
      if (generation !== epoch.current) return;
      setPendingSave("");
      if (!success) {
        setStatus(`${label}保存失败；原值保留，请重试`);
        return;
      }
      commit();
    }, 300);
  }
  function finishLeave(next: Leave) {
    discardEditor();
    setLeave(null);
    if (next.kind === "close") {
      epoch.current++;
      discoveryFlights.current.clear();
      cancelLogin();
      finishToolEdit();
      setDeleteSource(null);
      setSourceTestTarget(null);
      setToolTests((items) =>
        Object.fromEntries(Object.entries(items).filter(([, r]) => !r.pending)),
      );
      setOpened(false);
      setConnections((items) =>
        items.map((c) =>
          c.discovery === "checking"
            ? { ...c, discovery: c.modelIds.length ? "failed" : "idle" }
            : c,
        ),
      );
      setTestResult((items) =>
        Object.fromEntries(Object.entries(items).filter(([, r]) => !r.pending)),
      );
      setStatus("配置窗口已关闭；已完成登录保留");
    } else if (next.kind === "switch") {
      const target = connections.find((c) => c.id === next.connectionId);
      if (target) {
        setSelected(target.id);
        editConnection(target);
      }
    } else setStatus("已取消编辑；已完成登录保留");
  }
  function requestLeave(next: Leave) {
    if (pendingSave) return;
    if (next.kind === "close" && (sourceDraft || jsonEditor || searchDraft)) {
      requestToolLeave("close");
      return;
    }
    if (
      editing &&
      (secret.trim() ||
        draftFields(editing) !== baseline ||
        (editing.registrationId &&
          registrationLabel !==
            registrations.find((r) => r.id === editing.registrationId)?.label))
    )
      setLeave(next);
    else finishLeave(next);
  }
  function closeEditor() {
    requestLeave({ kind: "cancel" });
  }
  function saveConnection(after?: Leave) {
    if (!editing || !canSaveConnection) return;
    const old = connections.find((c) => c.id === editing.id);
    const saved: Connection = {
      ...editing,
      keySaved: editing.needsKey && (editing.keySaved || !!secret.trim()),
      credentialId: editing.needsKey
        ? secret.trim()
          ? id("key")
          : editing.credentialId
        : undefined,
      endpoint: resolvedEndpoint(editing),
      repairRequired: false,
    };
    if (
      saved.kind === "api-key" &&
      (!old ||
        old.serviceAccount !== saved.serviceAccount ||
        old.serviceGateway !== saved.serviceGateway ||
        old.repairRequired)
    )
      saved.modelTargets = Object.fromEntries(
        saved.modelIds.map((modelId) => [modelId, modelTarget(saved, modelId)]),
      );
    if (saved.kind !== "chatgpt") {
      saved.discovery = "ready";
      if (saved.kind === "custom" && !old) saved.modelIds = ["alpha", "beta"];
    }
    queueSave("连接", () => {
      const current =
        latest.current.connections.find((c) => c.id === saved.id) ||
        latest.current.editing;
      const merged =
        current && current.registrationId === saved.registrationId
          ? {
              ...saved,
              modelIds: current.modelIds,
              discovery: current.discovery,
              factsIdentity: current.factsIdentity,
            }
          : saved;
      if (saved.kind !== "chatgpt")
        Object.assign(merged, {
          discovery: saved.discovery,
          modelIds: saved.modelIds,
        });
      setConnections((items) =>
        old
          ? items.map((c) => (c.id === saved.id ? merged : c))
          : [...items, merged],
      );
      if (saved.registrationId && registrationLabel.trim())
        patchRegistration(saved.registrationId, {
          label: registrationLabel.trim(),
        });
      setSelected(saved.id);
      setPage("connections");
      discardEditor();
      setStatus(
        `已保存连接「${saved.label}」；默认用途保留，测试结果见各模型卡片`,
      );
      if (after) finishLeave(after);
    });
  }
  function refreshModels(c: Connection, registration?: Registration) {
    if (discoveryFlights.current.has(c.id)) return;
    const r =
      registration || registrations.find((r) => r.id === c.registrationId);
    if (c.kind === "chatgpt" && !r?.signedIn) return;
    const requestId = id("discovery"),
      generation = epoch.current,
      outcome = discoveryOutcome;
    const identity = r?.identity;
    discoveryFlights.current.set(c.id, requestId);
    patchConnection(c.id, { discovery: "checking" });
    setTimeout(() => {
      if (
        generation !== epoch.current ||
        discoveryFlights.current.get(c.id) !== requestId
      )
        return;
      discoveryFlights.current.delete(c.id);
      const candidates = [
        latest.current.editing,
        ...latest.current.connections,
      ];
      const current = candidates.find(
        (entry) =>
          entry?.id === c.id && entry.registrationId === c.registrationId,
      );
      const currentReg = latest.current.registrations.find(
        (r) => r.id === c.registrationId,
      );
      if (!current || (identity && currentReg?.identity !== identity)) return;
      const patch: Partial<Connection> = {
        discovery: outcome as Connection["discovery"],
      };
      if (outcome !== "failed") {
        patch.factsIdentity = identity;
        if (c.kind === "chatgpt" && outcome !== "empty")
          patch.modelIds = [...new Set([...current.modelIds, "alpha", "beta"])];
      }
      setConnections((items) =>
        items.map((entry) =>
          entry.id === c.id && entry.registrationId === c.registrationId
            ? { ...entry, ...patch }
            : entry,
        ),
      );
      setEditing((entry) =>
        entry?.id === c.id && entry.registrationId === c.registrationId
          ? { ...entry, ...patch }
          : entry,
      );
      setStatus(
        outcome === "failed"
          ? "刷新失败；同一账户的已有模型保留"
          : outcome === "empty"
            ? "该账户本次未返回模型；已配置卡片保留"
            : "模型发现已完成；尚未进行推理测试",
      );
    }, 450);
  }
  function testFingerprint(
    c: Connection,
    modelId: string,
    state = latest.current,
  ) {
    const r = state.registrations.find((r) => r.id === c.registrationId);
    const model = modelsFor(c).find((m) => m.id === modelId);
    const reasoning =
      state.modelReasoning[`${c.id}/${modelId}`] ||
      Object.values(state.defaults).find(
        (d) => d?.connectionId === c.id && d.modelId === modelId,
      )?.reasoning ||
      (model?.reasoning.includes("medium") ? "medium" : model?.reasoning[0]) ||
      "none";
    return JSON.stringify([
      c.id,
      c.provider,
      c.registrationId,
      r?.identity,
      c.credentialId,
      c.endpoint,
      c.dialect,
      c.needsKey,
      c.localApproved,
      c.repairRequired,
      c.modelTargets?.[modelId],
      modelId,
      reasoning,
    ]);
  }
  function testEvidence(c: Connection, modelId: string) {
    const found = testResult[`${c.id}/${modelId}`];
    return found?.fingerprint === testFingerprint(c, modelId)
      ? found
      : undefined;
  }
  function canTest(c: Connection) {
    const registration = registrations.find((r) => r.id === c.registrationId);
    if (
      registration?.paused &&
      Object.entries(testResult).some(
        ([key, result]) =>
          result.pending &&
          connections.find((c) => key.startsWith(`${c.id}/`))
            ?.registrationId === registration.id,
      )
    )
      return false;
    return (
      connectionState(c, registrations).ready ||
      (registration?.paused === true &&
        connectionState(
          c,
          registrations.map((r) =>
            r.id === registration.id ? { ...r, paused: false } : r,
          ),
        ).ready)
    );
  }
  function testConnection(c: Connection, modelId: string) {
    if (!canTest(c) || !connections.some((entry) => entry.id === c.id)) return;
    setTestTarget({ connection: c, modelId });
  }
  function runTest() {
    if (!testTarget) return;
    const { connection: c, modelId } = testTarget;
    const r = registrations.find((r) => r.id === c.registrationId);
    const requestId = id("test"),
      fingerprint = testFingerprint(c, modelId),
      generation = epoch.current;
    const completed = requestOutcome === "completed";
    const key = `${c.id}/${modelId}`;
    setTestTarget(null);
    setTestResult((items) => ({
      ...items,
      [key]: {
        requestId,
        fingerprint,
        pending: true,
        text: "正在执行一次短推理请求…",
        tone: "muted",
      },
    }));
    setTimeout(() => {
      const current = latest.current.connections.find(
        (entry) => entry.id === c.id,
      );
      if (
        generation !== epoch.current ||
        !current?.modelIds.includes(modelId) ||
        fingerprint !== testFingerprint(current, modelId)
      )
        return;
      if (r?.paused && completed) patchRegistration(r.id, { paused: false });
      const text = completed
        ? r?.paused
          ? "试用请求已完成，暂停已解除；原任务仍需手动继续。"
          : "此模型的测试请求已完成"
        : "请求未完成；配置与默认用途保留，暂停不会解除。";
      setTestResult((items) =>
        items[key]?.requestId === requestId
          ? {
              ...items,
              [key]: {
                requestId,
                fingerprint,
                pending: false,
                text,
                tone: completed ? "success" : "warning",
              },
            }
          : items,
      );
      setStatus(text);
    }, 450);
  }
  function removalEffects(c: Connection, modelId?: string) {
    const affected = PURPOSES.filter(
      ({ key }) =>
        defaults[key]?.connectionId === c.id &&
        (!modelId || defaults[key]?.modelId === modelId),
    );
    const removesCommon = affected.some((p) => p.key === "common");
    return affected
      .map(
        ({ key, label }) =>
          `${label}：${key === "common" ? "变为未设置" : key === "title" ? "关闭自动标题" : removesCommon || !defaults.common ? "恢复继承，但通用默认未设置" : `恢复继承「${choiceLabel(defaults.common)}」`}`,
      )
      .concat(
        removesCommon
          ? PURPOSES.filter(
              ({ key }) =>
                (key === "conversation" || key === "skill") && !defaults[key],
            ).map(({ label }) => `${label}：继承的通用默认变为未设置`)
          : [],
      );
  }
  function clearPurposes(c: Connection, modelId?: string) {
    setDefaults(
      (current) =>
        Object.fromEntries(
          Object.entries(current).filter(
            ([, value]) =>
              value?.connectionId !== c.id ||
              (modelId && value.modelId !== modelId),
          ),
        ) as Defaults,
    );
  }
  function removeModel() {
    if (!deleteModel) return;
    const { connection: c, modelId } = deleteModel;
    queueSave("模型移除", () => {
      setConnections((items) =>
        items.map((entry) =>
          entry.id === c.id
            ? {
                ...entry,
                modelIds: entry.modelIds.filter((id) => id !== modelId),
              }
            : entry,
        ),
      );
      clearPurposes(c, modelId);
      setDeleteModel(null);
      setStatus("模型已移除；已按确认结果处理默认用途，连接与凭据保留");
    });
  }
  function removeAuth() {
    if (!authRemoval) return;
    const { registration: r, remove } = authRemoval;
    if (auth?.registrationId === r.id) cancelLogin();
    queueSave(remove ? "移除注册" : "退出登录", () => {
      discoveryFlights.current.forEach((_, ownerId) => {
        if (
          connections.find((c) => c.id === ownerId)?.registrationId === r.id ||
          (editing?.id === ownerId && editing.registrationId === r.id)
        )
          discoveryFlights.current.delete(ownerId);
      });
      setRegistrations((items) =>
        remove
          ? items.filter((entry) => entry.id !== r.id)
          : items.map((entry) =>
              entry.id === r.id
                ? {
                    ...entry,
                    signedIn: false,
                    welcome: false,
                    identity: id("signed-out"),
                  }
                : entry,
            ),
      );
      if (remove) {
        setConnections((items) =>
          items.map((c) =>
            c.registrationId === r.id
              ? {
                  ...c,
                  registrationId: undefined,
                  discovery: "idle",
                  factsIdentity: undefined,
                }
              : c,
          ),
        );
        setEditing((c) =>
          c?.registrationId === r.id
            ? {
                ...c,
                registrationId: undefined,
                discovery: "idle",
                factsIdentity: undefined,
              }
            : c,
        );
      }
      setAuthRemoval(null);
      setStatus(
        `本地已${remove ? "移除注册" : "退出"}；${revocationOutcome === "confirmed" ? "远端授权已撤销" : "远端撤销未确认"}；关联连接与默认用途保留`,
      );
    });
  }
  function removeConnection() {
    if (!deleteTarget) return;
    const c = deleteTarget;
    queueSave("连接移除", () => {
      setConnections((items) => items.filter((entry) => entry.id !== c.id));
      clearPurposes(c);
      discoveryFlights.current.delete(c.id);
      setDeleteTarget(null);
      const shared =
        c.credentialId &&
        connections.some(
          (entry) => entry.id !== c.id && entry.credentialId === c.credentialId,
        );
      setStatus(
        `连接已移除；${c.kind === "chatgpt" ? "账户登录保留" : shared ? "其他连接仍引用密钥，密钥保留" : "独占密钥一并清除"}；其他连接保留`,
      );
    });
  }
  function accountBlock(c: Connection) {
    const r = registrations.find((r) => r.id === c.registrationId);
    const active = auth?.ownerId === c.id ? auth : null;
    return (
      <div class="account-block stack">
        {r ? (
          <div class="row spread wrap">
            <div>
              <strong>{r.label || r.workspace}</strong>
              <p class="muted">{r.email}</p>
              <p class="muted">{r.workspace}</p>
            </div>
            <Badge tone={r.signedIn ? "success" : "warning"}>
              {r.signedIn ? "已登录" : "已退出"}
            </Badge>
          </div>
        ) : (
          <div>
            <strong>使用 ChatGPT 账户连接</strong>
            <p class="muted">在浏览器中登录并选择要授权的空间。</p>
          </div>
        )}
        {active ? (
          <>
            <div class="auth-progress" role="status">
              {active.phase !== "failed" && active.phase !== "expired" && (
                <span class="spinner" />
              )}
              <span>
                {active.phase === "waiting"
                  ? "等待浏览器登录…"
                  : active.phase === "exchange"
                    ? "正在交换授权…"
                    : active.phase === "verify"
                      ? "正在验证账户…"
                      : active.phase === "expired"
                        ? "登录已超时，请重试。"
                        : "登录未完成，请重试。"}
              </span>
            </div>
            <div class="row">
              <Button onClick={cancelLogin}>取消登录</Button>
              {(active.phase === "failed" || active.phase === "expired") && (
                <Button
                  onClick={() => {
                    setAuth(null);
                    setStatus("可以重新登录");
                  }}
                >
                  返回
                </Button>
              )}
            </div>
          </>
        ) : !r?.signedIn ? (
          <Button primary disabled={!!auth} onClick={() => beginLogin(c)}>
            {r ? "重新登录 ChatGPT" : "使用 ChatGPT 登录"}
          </Button>
        ) : null}
        {r?.signedIn && !r.permission && (
          <div class="banner warning">
            <strong>账户已登录，尚未允许使用 ChatGPT 方案</strong>
            <p>重新授权时允许此应用使用你的方案，然后返回继续配置。</p>
            <div class="row" style={{ marginTop: 9 }}>
              <Button disabled={!!auth} onClick={() => beginLogin(c)}>
                重新授权
              </Button>
            </div>
          </div>
        )}
        {r?.signedIn && r.permission && !r.welcome && (
          <div class="banner">
            <strong>允许 Zotero Agent 使用此 ChatGPT 方案？</strong>
            <p>
              运行对话、工作流或连接测试时会使用方案额度。登录本身不会执行这些任务。
            </p>
            <div class="row" style={{ marginTop: 10 }}>
              <Button
                primary
                disabled={!!pendingSave}
                onClick={() =>
                  queueSave("方案确认", () => {
                    patchRegistration(r.id, { welcome: true });
                    setStatus("已确认使用方案；尚未测试模型");
                  })
                }
              >
                确认使用此方案
              </Button>
            </div>
          </div>
        )}
        {r?.signedIn && r.reauthorize && (
          <div class="banner warning">
            <strong>授权需要更新</strong>
            <p>此账户的新模型请求已停用，请重新授权。</p>
            <Button disabled={!!auth} onClick={() => beginLogin(c)}>
              重新授权
            </Button>
          </div>
        )}
        {r?.signedIn && r.paused && (
          <div class="banner warning">
            <strong>此账户的模型调用已暂停</strong>
            <p>
              检查用量后，可以发送一次试用请求检查是否恢复。系统不会自动恢复任务。
            </p>
            <div class="row wrap" style={{ marginTop: 9 }}>
              <Button
                onClick={() =>
                  setStatus("请在 ChatGPT 方案用量页查看此账户的额度")
                }
              >
                管理用量
              </Button>
            </div>
            <p>在下方模型卡片中选择“测试并恢复”。</p>
          </div>
        )}
        {r?.signedIn && (
          <div class="row wrap">
            <Button
              small
              disabled={!!pendingSave}
              onClick={() => setAuthRemoval({ registration: r, remove: false })}
            >
              退出登录
            </Button>
            <Button
              small
              onClick={() =>
                setStatus("请在 ChatGPT 方案用量页查看此账户的额度")
              }
            >
              管理用量
            </Button>
          </div>
        )}
        {r && (
          <div>
            <Button
              small
              danger
              disabled={!!pendingSave}
              onClick={() => setAuthRemoval({ registration: r, remove: true })}
            >
              移除此授权
            </Button>
          </div>
        )}
      </div>
    );
  }
  function choiceLabel(choice: ModelChoice | undefined) {
    if (!choice) return "尚未选择";
    const connection = connections.find((c) => c.id === choice.connectionId);
    const model =
      connection && modelsFor(connection).find((m) => m.id === choice.modelId);
    return `${connection?.label || "连接已移除"} · ${model?.name || "模型不可用"}`;
  }
  function effectiveChoice(key: keyof Defaults) {
    return (
      defaults[key] ||
      (key === "conversation" || key === "skill" ? defaults.common : undefined)
    );
  }
  function reasoningFor(c: Connection, modelId: string) {
    const model = modelsFor(c).find((m) => m.id === modelId);
    if (!model?.reasoning.length) return "none";
    return (
      modelReasoning[`${c.id}/${modelId}`] ||
      Object.values(defaults).find(
        (d) => d?.connectionId === c.id && d.modelId === modelId,
      )?.reasoning ||
      (model.reasoning.includes("medium") ? "medium" : model.reasoning[0])
    );
  }
  function assignPurpose(c: Connection, modelId: string, key: keyof Defaults) {
    const current = defaults[key];
    const same = current?.connectionId === c.id && current.modelId === modelId;
    if (!same && !connectionState(c, registrations).ready) return;
    if (same && key === "common") return;
    const next = same
      ? undefined
      : { connectionId: c.id, modelId, reasoning: reasoningFor(c, modelId) };
    queueSave("默认用途", () => {
      setDefaults((d) => ({ ...d, [key]: next }));
      const purpose = PURPOSES.find((p) => p.key === key)!.label;
      setStatus(
        next
          ? `${purpose}模型已设为「${choiceLabel(next)}」；后续新请求使用此选择${current && !same ? `，替换「${choiceLabel(current)}」` : ""}`
          : key === "title"
            ? "已关闭自动生成会话标题"
            : `${purpose}模型已恢复跟随常用`,
      );
    });
  }
  function modelBlock(c: Connection, configure = false) {
    const ready = connectionState(c, registrations).ready;
    const registration = registrations.find((r) => r.id === c.registrationId);
    return (
      <section class="stack">
        <div class="row spread">
          <h3>{configure ? "模型与默认用途" : "此连接的模型"}</h3>
          <div class="row">
            {configure && c.kind === "api-key" && (
              <Button
                small
                disabled={!ready || !!pendingSave}
                onClick={() => {
                  setModelOwner(c);
                  setModelQuery("");
                  setModelPage(0);
                }}
              >
                添加模型
              </Button>
            )}
            <Button
              small
              disabled={c.discovery === "checking" || !!pendingSave}
              onClick={() => refreshModels(c)}
            >
              {c.kind === "api-key" ? "刷新目录" : "刷新模型"}
            </Button>
          </div>
        </div>
        {c.discovery === "failed" && (
          <div class="banner warning">
            模型刷新失败。账户和已保存的模型选择保留，可再次刷新。
          </div>
        )}
        {c.discovery === "unknown" && (
          <div class="banner warning">
            账户可见这些模型，但尚缺执行所需的能力信息，暂时不能用于新任务。
          </div>
        )}
        {c.discovery === "empty" && (
          <div class="banner warning">
            此账户本次未返回模型。已配置卡片与默认用途保留，暂不可用于新任务。
          </div>
        )}
        {c.discovery === "checking" && (
          <p role="status" class="muted">
            正在获取模型；完成后更新此账户的列表。
          </p>
        )}
        {configure && !defaults.common && (
          <div class="banner">
            尚未设置通用默认模型。请在需要的卡片上点击“设为常用”。
          </div>
        )}
        {c.discovery === "idle" ? (
          <p class="muted">连接后获取模型列表。</p>
        ) : (
          <div class={configure ? "model-config-list" : "model-list"}>
            {modelsFor(c).map((m) => (
              <article
                class={configure ? "model-config-card" : "model-row"}
                key={m.id}
                aria-label={m.name}
              >
                <div class="row spread wrap">
                  <div>
                    <strong>{m.name}</strong>
                    <small class="muted model-note">{m.note}</small>
                    {overlay && m.id === "beta" && (
                      <small class="muted model-note">
                        补充限制已采用：上下文 16,384 · 输出上限 2,048
                      </small>
                    )}
                  </div>
                  {configure && m.reasoning.length > 0 ? (
                    <label class="model-reasoning">
                      <span>推理</span>
                      <Choice
                        label={`${m.name}推理级别`}
                        value={reasoningFor(c, m.id)}
                        disabled={!ready || !!pendingSave}
                        options={m.reasoning.map((value) => ({
                          value,
                          label:
                            (
                              { low: "低", medium: "中", high: "高" } as Record<
                                string,
                                string
                              >
                            )[value] || value,
                        }))}
                        onChange={(reasoning) => {
                          queueSave("推理强度", () => {
                            setModelReasoning((r) => ({
                              ...r,
                              [`${c.id}/${m.id}`]: reasoning,
                            }));
                            setDefaults(
                              (d) =>
                                Object.fromEntries(
                                  Object.entries(d).map(([key, value]) => [
                                    key,
                                    value?.connectionId === c.id &&
                                    value.modelId === m.id
                                      ? { ...value, reasoning }
                                      : value,
                                  ]),
                                ) as Defaults,
                            );
                            setStatus(`「${m.name}」的默认推理级别已保存`);
                          });
                        }}
                      />
                    </label>
                  ) : (
                    <Badge
                      tone={c.discovery === "unknown" ? "warning" : "muted"}
                    >
                      {c.discovery === "unknown"
                        ? "信息不足"
                        : configure
                          ? "不支持推理"
                          : "可选择"}
                    </Badge>
                  )}
                </div>
                {configure && (
                  <div class="purpose-actions" aria-label="设置默认用途">
                    {PURPOSES.map(({ key, label }) => {
                      const explicit =
                        defaults[key]?.connectionId === c.id &&
                        defaults[key]?.modelId === m.id;
                      const effective = effectiveChoice(key);
                      const inherited =
                        !defaults[key] &&
                        effective?.connectionId === c.id &&
                        effective.modelId === m.id;
                      return (
                        <button
                          type="button"
                          key={key}
                          class={`purpose-button${explicit ? " assigned" : inherited ? " inherited" : ""}`}
                          aria-pressed={explicit}
                          disabled={
                            !!pendingSave ||
                            (!ready && !explicit) ||
                            (key === "common" && explicit)
                          }
                          title={
                            explicit
                              ? key === "common"
                                ? "当前常用模型"
                                : key === "title"
                                  ? "点击关闭自动标题"
                                  : "点击恢复跟随常用"
                              : key === "title"
                                ? "用于自动生成会话标题"
                                : `设为${label}默认模型`
                          }
                          onClick={() => assignPurpose(c, m.id, key)}
                        >
                          {explicit
                            ? `✓ ${label}`
                            : inherited
                              ? `${label} · 跟随常用`
                              : `设为${label}`}
                        </button>
                      );
                    })}
                  </div>
                )}
                {configure && (
                  <>
                    <div class="row spread wrap">
                      <Badge tone={testEvidence(c, m.id)?.tone || "muted"}>
                        {testEvidence(c, m.id)?.pending
                          ? "测试中"
                          : testEvidence(c, m.id)?.tone === "success"
                            ? "此模型测试已完成"
                            : testEvidence(c, m.id)
                              ? "测试未完成"
                              : "尚未测试"}
                      </Badge>
                      <div class="row wrap">
                        <Button
                          small
                          disabled={
                            !canTest(c) ||
                            !!pendingSave ||
                            Object.values(testResult).some(
                              (result) =>
                                result.pending &&
                                result.fingerprint === testFingerprint(c, m.id),
                            )
                          }
                          onClick={() => testConnection(c, m.id)}
                        >
                          {registration?.paused ? "测试并恢复" : "测试此模型"}
                        </Button>
                        <Button
                          small
                          danger
                          disabled={!!pendingSave}
                          onClick={() =>
                            setDeleteModel({ connection: c, modelId: m.id })
                          }
                        >
                          移除模型
                        </Button>
                      </div>
                    </div>
                    {testEvidence(c, m.id) && (
                      <p class="muted" role="status">
                        {testEvidence(c, m.id)!.text}
                      </p>
                    )}
                    {!ready && (
                      <p class="muted">
                        {connectionState(c, registrations).label}
                        ；默认用途保留。
                      </p>
                    )}
                  </>
                )}
              </article>
            ))}
          </div>
        )}
        {configure && c.kind === "api-key" && !c.modelIds.length && (
          <div class="banner">
            从此服务商的模型目录中添加需要配置的模型，再为它设置默认用途。
          </div>
        )}
        {pendingSave && configure && (
          <p role="status">正在保存{pendingSave}…</p>
        )}
        {configure ? (
          <p class="muted purpose-help">
            点击用途即保存。会话与工作流未单独选择时跟随常用；再次点击已设置的用途可恢复跟随或关闭标题。
          </p>
        ) : (
          <p class="muted">保存连接后，在模型卡片中选择默认用途。</p>
        )}
      </section>
    );
  }
  function connectionDetails(c: Connection) {
    const state = connectionState(c, registrations);
    return (
      <div class="stack">
        <div class="row spread">
          <div class="row">
            <span class="brand-icon">{c.kind === "chatgpt" ? "C" : "API"}</span>
            <div>
              <h3>{c.label}</h3>
              <small class="muted">{KIND_LABEL[c.kind]}</small>
            </div>
          </div>
          <Badge tone={state.tone}>{state.label}</Badge>
        </div>
        {c.kind === "chatgpt" ? (
          <details class="account-details" open={!state.ready}>
            <summary>
              <strong>账户与登录</strong>
              <span class="muted">
                {registrations.find((r) => r.id === c.registrationId)?.email ||
                  "尚未登录"}{" "}
                ·{" "}
                {registrations.find((r) => r.id === c.registrationId)
                  ?.workspace || ""}
              </span>
            </summary>
            {accountBlock(c)}
          </details>
        ) : (
          <div class="small-stack">
            <div class="detail-line row">
              <span class="muted">服务</span>
              <span>
                {c.kind === "custom" ? c.endpoint : providerLabel(c.provider)}
              </span>
            </div>
            <div class="detail-line row">
              <span class="muted">认证</span>
              <span>
                {c.needsKey
                  ? c.keySaved
                    ? "API Key · ••••••••"
                    : "尚未填写 API Key"
                  : "无需密钥"}
              </span>
            </div>
          </div>
        )}
        {modelBlock(c, true)}
        <div class="row wrap">
          <Button disabled={!!pendingSave} onClick={() => editConnection(c)}>
            编辑连接
          </Button>
          <Button
            danger
            disabled={!!pendingSave}
            onClick={() => setDeleteTarget(c)}
          >
            移除连接
          </Button>
        </div>
      </div>
    );
  }
  function connectionsPage() {
    return (
      <>
        <Header
          title="模型工作台"
          description="连接一次，在各模型卡片中设置默认用途。"
          action={
            <div class="row">
              <Button primary onClick={() => setAddOpen(true)}>
                ＋ 添加连接
              </Button>
            </div>
          }
        />
        {!connections.length ? (
          <div class="page-content">
            <div class="empty">
              <div class="empty-symbol">↗</div>
              <h2>先连接一个模型服务</h2>
              <p>
                使用 ChatGPT 方案、API
                Key，或接入自定义服务。连接时不需要先选择模型。
              </p>
              <div class="row wrap">
                <Button primary onClick={() => addConnection("chatgpt")}>
                  使用 ChatGPT 登录
                </Button>
                <Button onClick={() => setAddOpen(true)}>其他连接方式</Button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div class="purpose-summary" aria-label="当前默认模型">
              {PURPOSES.map(({ key, label }) => {
                const choice = effectiveChoice(key);
                const c = connections.find(
                  (c) => c.id === choice?.connectionId,
                );
                return (
                  <button
                    type="button"
                    key={key}
                    disabled={!c}
                    onClick={() => c && setSelected(c.id)}
                    title={choiceLabel(choice)}
                  >
                    <span class="row spread">
                      <strong>{label}</strong>
                      <small>
                        {!defaults[key] &&
                        (key === "conversation" || key === "skill")
                          ? "跟随常用"
                          : key === "title" && !choice
                            ? "未启用"
                            : ""}
                      </small>
                    </span>
                    <span>
                      {choice
                        ? c &&
                          modelsFor(c).find((m) => m.id === choice.modelId)
                            ?.name
                        : key === "title"
                          ? "自动标题已关闭"
                          : "尚未选择"}
                    </span>
                    <small>
                      {c?.label || "在模型卡片中设置"}
                      {c && !connectionState(c, registrations).ready
                        ? " · 暂不可用"
                        : ""}
                    </small>
                  </button>
                );
              })}
            </div>
            <div class="master-detail">
              <div class="connection-list" aria-label="模型连接">
                {connections.map((c) => {
                  const state = connectionState(c, registrations);
                  const purposes = PURPOSES.filter(
                    (p) => defaults[p.key]?.connectionId === c.id,
                  ).map((p) => p.label);
                  return (
                    <button
                      type="button"
                      key={c.id}
                      class={`connection-row${chosen?.id === c.id ? " selected" : ""}`}
                      onClick={() => setSelected(c.id)}
                    >
                      <span class="brand-icon">
                        {c.kind === "chatgpt" ? "C" : "API"}
                      </span>
                      <span>
                        <strong>{c.label}</strong>
                        <small>{state.label}</small>
                        {!!purposes.length && (
                          <small class="connection-purposes">
                            {purposes.join(" · ")}
                          </small>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div class="detail-content">
                {chosen && connectionDetails(chosen)}
              </div>
            </div>
          </>
        )}
      </>
    );
  }
  function overviewPage() {
    return (
      <>
        <Header
          title="开始使用"
          description="先建立连接，再选择模型；工具可以之后配置。"
        />
        <div class="page-content">
          <div class="hero">
            <h2>
              {!connections.length
                ? "让 Zotero Agent 准备就绪"
                : hasDefault
                  ? "已经可以开始使用"
                  : "继续完成模型设置"}
            </h2>
            <p class="muted">
              {!connections.length
                ? "选择你已经在使用的账户或模型服务。"
                : hasDefault
                  ? "你可以随时调整模型和扩展工具。"
                  : "完成连接后，选择一个常用模型。"}
            </p>
          </div>
          <div class="steps">
            <div
              class={`step ${readyConnections.length ? "complete" : "current"}`}
            >
              <span>{readyConnections.length ? "✓" : "1"}</span>连接服务
            </div>
            <div
              class={`step ${hasDefault ? "complete" : readyConnections.length ? "current" : ""}`}
            >
              <span>{hasDefault ? "✓" : "2"}</span>选择模型
            </div>
            <div class={`step ${hasDefault ? "current" : ""}`}>
              <span>3</span>开始使用
            </div>
          </div>
          {!connections.length ? (
            <div class="stack">
              {(["chatgpt", "api-key", "custom"] as Kind[]).map((kind) => (
                <button
                  type="button"
                  key={kind}
                  class="setup-choice"
                  onClick={() => addConnection(kind)}
                >
                  <span class="brand-icon">
                    {kind === "chatgpt" ? "C" : "API"}
                  </span>
                  <span>
                    <strong>
                      {kind === "chatgpt"
                        ? "使用 ChatGPT 方案"
                        : kind === "api-key"
                          ? "使用 API Key"
                          : "连接自定义服务"}
                    </strong>
                    <small>
                      {kind === "chatgpt"
                        ? "在浏览器中登录，无需先选择模型。"
                        : kind === "api-key"
                          ? "连接已有的模型服务。"
                          : "接入兼容接口或本地模型。"}
                    </small>
                  </span>
                  <span style={{ marginLeft: "auto" }}>→</span>
                </button>
              ))}
            </div>
          ) : (
            <div class="card">
              <div class="overview-task row spread wrap">
                <div>
                  <h3>模型连接</h3>
                  <small class="muted">
                    {readyConnections.length} 个可用连接，共{" "}
                    {connections.length} 个
                  </small>
                </div>
                <Button onClick={() => setPage("connections")}>管理连接</Button>
              </div>
              <div class="overview-task row spread wrap">
                <div>
                  <h3>常用模型</h3>
                  <small class="muted">
                    {hasDefault
                      ? `${connections.find((c) => c.id === defaults.common?.connectionId)?.label} · ${modelsFor(connections.find((c) => c.id === defaults.common?.connectionId)!).find((m) => m.id === defaults.common?.modelId)?.name}`
                      : "尚未设置可用的常用模型"}
                  </small>
                </div>
                <Button
                  primary={!hasDefault}
                  onClick={() => {
                    setSelected(
                      defaults.common?.connectionId ||
                        readyConnections[0]?.id ||
                        connections[0]?.id ||
                        "",
                    );
                    setPage("connections");
                  }}
                >
                  {hasDefault ? "调整模型" : "选择模型"}
                </Button>
              </div>
              <div class="overview-task row spread wrap">
                <div>
                  <h3>MCP 工具</h3>
                  <small class="muted">可选，连接外部工具服务</small>
                </div>
                <Button onClick={() => setPage("mcp")}>配置 MCP</Button>
              </div>
              <div class="overview-task row spread wrap">
                <div>
                  <h3>搜索</h3>
                  <small class="muted">配置搜索来源与使用顺序</small>
                </div>
                <Button onClick={() => setPage("search")}>配置搜索</Button>
              </div>
            </div>
          )}
        </div>
      </>
    );
  }
  function loadSourceEditor(s: Source, resetBaseline = true) {
    const auth = sourceAuthSelection(s);
    const env = Object.entries(s.env).map(([key, credentialId]) => ({
      id: id("entry"),
      key,
      credentialId,
      value: "",
    }));
    const headers = Object.entries(s.headers)
      .filter(
        ([key]) =>
          !(auth.kind === "bearer" || auth.kind === "api-key") ||
          key.toLowerCase() !== auth.key.toLowerCase(),
      )
      .map(([key, credentialId]) => ({
        id: id("entry"),
        key,
        credentialId,
        value: "",
      }));
    const preset = ["X-API-Key", "api-key"].includes(auth.key)
      ? auth.key
      : auth.kind === "api-key"
        ? "custom"
        : "X-API-Key";
    const custom = preset === "custom" ? auth.key : "";
    setSourceDraft({ ...s, args: [...s.args] });
    setSourceEnv(env);
    setSourceHeaders(headers);
    setSourceAuth(auth.kind);
    setSourceApiHeader(preset);
    setSourceCustomHeader(custom);
    setSourceToken("");
    if (resetBaseline) {
      setSourceBaseline(JSON.stringify(s));
      setSourceEntryBaseline(
        JSON.stringify([env, headers, auth.kind, preset, custom]),
      );
    }
  }
  function editSource(s: Source) {
    loadSourceEditor(s);
  }
  function changeSourceAuth(kind: NonNullable<Source["httpAuth"]>) {
    setSourceAuth(kind);
    setSourceToken("");
    const authKeys = [
      "authorization",
      "x-api-key",
      "api-key",
      sourceDraft ? sourceAuthSelection(sourceDraft).key.toLowerCase() : "",
    ];
    setSourceHeaders((items) => {
      const others = items.filter(
        (item) => !authKeys.includes(item.key.toLowerCase()),
      );
      if (kind !== "custom" || !sourceDraft) return others;
      return [
        ...others,
        ...Object.entries(sourceDraft.headers)
          .filter(([key]) => authKeys.includes(key.toLowerCase()))
          .map(([key, credentialId]) => ({
            id: id("entry"),
            key,
            credentialId,
            value: "",
          })),
      ];
    });
  }
  function editSearch(s: WebSource) {
    setSearchDraft({ ...s });
    setSearchBaseline(JSON.stringify(s));
    setSearchSecret("");
    setSearchArgs(JSON.stringify(s.args));
  }
  function openJson(mode: JsonEditor["mode"]) {
    const text = mode === "import" ? '{"mcpServers": {}}' : sourceJson(sources);
    setJsonEditor({ mode, text, baseline: text, replace: [], grants: [] });
  }
  function finishToolEdit(close = false) {
    setSourceDraft(null);
    setSearchDraft(null);
    setJsonEditor(null);
    setSourceEnv([]);
    setSourceHeaders([]);
    setSourceToken("");
    setSearchSecret("");
    setToolLeave(null);
    if (close) finishLeave({ kind: "close" });
  }
  function toolDirty() {
    return !!(
      (sourceDraft &&
        (JSON.stringify(sourceDraft) !== sourceBaseline ||
          JSON.stringify([
            sourceEnv,
            sourceHeaders,
            sourceAuth,
            sourceApiHeader,
            sourceCustomHeader,
          ]) !== sourceEntryBaseline ||
          !!sourceToken)) ||
      (searchDraft &&
        (JSON.stringify(searchDraft) !== searchBaseline ||
          searchSecret ||
          searchArgs !== JSON.stringify(searchDraft.args))) ||
      (jsonEditor &&
        jsonEditor.mode !== "export" &&
        (jsonEditor.text !== jsonEditor.baseline ||
          jsonEditor.replace.length ||
          jsonEditor.grants.length))
    );
  }
  function requestToolLeave(action: "close" | "cancel") {
    if (pendingSave) return;
    if (toolDirty()) setToolLeave(action);
    else finishToolEdit(action === "close");
  }
  function sourceAuthKey() {
    return sourceAuth === "bearer"
      ? "Authorization"
      : sourceAuth === "api-key"
        ? sourceApiHeader === "custom"
          ? sourceCustomHeader.trim()
          : sourceApiHeader
        : "";
  }
  function sourceStoredToken() {
    if (!sourceDraft) return undefined;
    const key = sourceAuthKey(),
      original = sourceAuthSelection(sourceDraft);
    const oldKey = Object.keys(sourceDraft.headers).find(
      (name) => name.toLowerCase() === key.toLowerCase(),
    );
    return original.kind === sourceAuth &&
      original.key.toLowerCase() === key.toLowerCase() &&
      oldKey
      ? sourceDraft.headers[oldKey]
      : undefined;
  }
  function sourceCandidate(materialize = false): {
    source?: Source;
    error?: string;
  } {
    if (!sourceDraft) return {};
    try {
      const bind = (
        entries: BindingEntry[],
        label: string,
        caseInsensitive = false,
      ) => {
        const seen = new Set<string>();
        return Object.fromEntries(
          entries.map((entry) => {
            const key = entry.key.trim(),
              identity = caseInsensitive ? key.toLowerCase() : key;
            if (!key || /[\r\n\0]/.test(key))
              throw Error(`请填写有效的${label}名称`);
            if (seen.has(identity)) throw Error(`${label}名称不能重复`);
            seen.add(identity);
            if (!entry.value && !entry.credentialId)
              throw Error(`请填写${label}值，或移除空条目`);
            if (caseInsensitive && /[\r\n\0]/.test(entry.value))
              throw Error("请求头值不能包含换行");
            return [
              key,
              entry.value
                ? materialize
                  ? id("credential")
                  : "draft-credential"
                : entry.credentialId!,
            ];
          }),
        );
      };
      if (sourceDraft.args.some((arg) => arg.includes("\0")))
        throw Error("参数不能包含空字符");
      if (sourceDraft.transport === "stdio")
        return {
          source: {
            ...sourceDraft,
            headers: {},
            env: bind(sourceEnv, "环境变量"),
            httpAuth: "none",
            httpAuthHeader: "",
          },
        };
      const headers = bind(sourceHeaders, "请求头", true);
      const authKey = sourceAuthKey();
      if (sourceAuth === "bearer" || sourceAuth === "api-key") {
        if (!/^[A-Za-z0-9_-]+$/.test(authKey))
          throw Error("请填写有效的 API Key 请求头名称");
        if (
          Object.keys(headers).some(
            (key) => key.toLowerCase() === authKey.toLowerCase(),
          )
        )
          throw Error("认证字段已配置，请移除重复的高级条目");
        const existing = sourceStoredToken();
        const token =
          sourceAuth === "bearer"
            ? sourceToken.replace(/^\s*Bearer\s+/i, "").trim()
            : sourceToken.trim();
        if (!token && !existing)
          throw Error(
            sourceAuth === "bearer" ? "请填写鉴权 token" : "请填写 API Key",
          );
        headers[authKey] = token
          ? materialize
            ? id("credential")
            : "draft-credential"
          : existing!;
      }
      return {
        source: {
          ...sourceDraft,
          args: [],
          cwd: "",
          env: {},
          headers,
          httpAuth: sourceAuth,
          httpAuthHeader:
            sourceAuth === "custom"
              ? Object.keys(headers).find(
                  (key) =>
                    key.toLowerCase() ===
                    sourceAuthSelection(sourceDraft).key.toLowerCase(),
                ) || ""
              : authKey,
        },
      };
    } catch (e) {
      return { error: (e as Error).message };
    }
  }
  function jsonPlan() {
    if (!jsonEditor)
      return {
        next: sources,
        added: 0,
        changed: 0,
        removed: 0,
        parsed: [] as Source[],
        error: "",
      };
    try {
      const parsed = parseSources(
        jsonEditor.text,
        sources,
        jsonEditor.grants,
        jsonEditor.mode === "edit",
      );
      const next =
        jsonEditor.mode === "import"
          ? [
              ...sources.map((s) =>
                jsonEditor.replace.includes(s.id)
                  ? parsed.find((p) => p.id === s.id) || s
                  : s,
              ),
              ...parsed.filter((p) => !sources.some((s) => s.id === p.id)),
            ]
          : parsed;
      return {
        next,
        parsed,
        added: next.filter((s) => !sources.some((p) => p.id === s.id)).length,
        changed: next.filter((s) => {
          const old = sources.find((p) => p.id === s.id);
          return old && JSON.stringify(old) !== JSON.stringify(s);
        }).length,
        removed: sources.filter((s) => !next.some((p) => p.id === s.id)).length,
        error: "",
      };
    } catch (e) {
      return {
        next: sources,
        parsed: [] as Source[],
        added: 0,
        changed: 0,
        removed: 0,
        error:
          e instanceof SyntaxError
            ? "JSON 格式无效，原文保留，请修改后保存"
            : (e as Error).message,
      };
    }
  }
  function nativeConnections(s: WebSource) {
    return connections.filter((c) =>
      s.kind === "openai-native"
        ? c.kind === "chatgpt" || c.provider === "openai"
        : c.provider === "anthropic",
    );
  }
  function validSearch(s: WebSource): boolean {
    if (s.kind.endsWith("-native")) {
      const c = nativeConnections(s).find((c) => c.id === s.connectionId);
      return (
        !!c &&
        !!s.modelId &&
        c.modelIds.includes(s.modelId) &&
        connectionState(c, registrations).ready
      );
    }
    if (s.kind === "searxng")
      return (
        validEndpoint(s.endpoint) &&
        (s.endpoint.startsWith("https:") || isLocal(s.endpoint)) &&
        (!isLocal(s.endpoint) || s.approved)
      );
    if (s.kind === "brave-mcp")
      return !!s.credentialId && /^(\/|[A-Za-z]:[\\/])/.test(s.executable);
    return s.kind === "exa-mcp" || !!s.credentialId;
  }
  function saveToolEdit(close = false) {
    if (pendingSave) return;
    if (sourceDraft) {
      const result = sourceCandidate(true);
      if (!result.source || !validSource(result.source)) return;
      const saved = result.source;
      queueSave("保存 MCP 来源", () => {
        setSources((items) =>
          items.some((s) => s.id === saved.id)
            ? items.map((s) => (s.id === saved.id ? saved : s))
            : [...items, saved],
        );
        setStatus("MCP 配置已保存，后续任务可使用；连接测试可按需进行");
        finishToolEdit(close);
      });
    } else if (jsonEditor && jsonEditor.mode !== "export") {
      const plan = jsonPlan();
      if (plan.error || plan.next.some((s) => !validSource(s))) return;
      queueSave("保存 MCP JSON", () => {
        setSources(plan.next);
        setStatus(
          `配置已保存：新增 ${plan.added}，修改 ${plan.changed}，移除 ${plan.removed}`,
        );
        finishToolEdit(close);
      });
    } else if (searchDraft) {
      let args: string[];
      try {
        args = stringArgs(searchArgs);
      } catch {
        return;
      }
      const saved = {
        ...searchDraft,
        args,
        credentialId: searchSecret.trim()
          ? id("search-key")
          : searchDraft.credentialId,
      };
      if (!validSearch(saved)) return;
      queueSave("保存搜索来源", () => {
        setWebSources((items) =>
          items.map((s) => (s.id === saved.id ? saved : s)),
        );
        setStatus("搜索配置已保存，启用状态保持原值；可独立测试此来源");
        finishToolEdit(close);
      });
    }
  }
  function toolFingerprint(s: Source | WebSource) {
    const configuration = Object.fromEntries(
      Object.entries(s).filter(([key]) => key !== "enabled" && key !== "label"),
    );
    const c =
      "kind" in s && s.kind.endsWith("-native")
        ? latest.current.connections.find((c) => c.id === s.connectionId)
        : undefined;
    const r = latest.current.registrations.find(
      (r) => r.id === c?.registrationId,
    );
    return JSON.stringify([
      configuration,
      c && [
        c.registrationId,
        c.credentialId,
        c.endpoint,
        c.repairRequired,
        c.modelTargets,
        c.discovery,
      ],
      r && [
        r.identity,
        r.signedIn,
        r.permission,
        r.welcome,
        r.paused,
        r.reauthorize,
      ],
    ]);
  }
  function testToolSource(target: Source | WebSource) {
    const fingerprint = toolFingerprint(target),
      requestId = id("source-test"),
      capturedEpoch = epoch.current,
      outcome = requestOutcome;
    setSourceTestTarget(null);
    setToolTests((items) => ({
      ...items,
      [target.id]: {
        requestId,
        fingerprint,
        pending: true,
        text: "正在测试此来源",
        tone: "muted",
      },
    }));
    setTimeout(() => {
      const current = [
        ...toolCurrent.current.sources,
        ...toolCurrent.current.webSources,
      ].find((s) => s.id === target.id);
      if (
        capturedEpoch !== epoch.current ||
        !current ||
        toolFingerprint(current) !== fingerprint
      )
        return;
      setToolTests((items) =>
        items[target.id]?.requestId !== requestId
          ? items
          : {
              ...items,
              [target.id]: {
                requestId,
                fingerprint,
                pending: false,
                text:
                  outcome === "completed"
                    ? "kind" in target
                      ? "此来源搜索测试完成"
                      : "连接正常 · 2 个工具可用"
                    : outcome === "incomplete"
                      ? "响应未完成，尚不能确认可用"
                      : "测试失败，可检查配置后重试",
                tone: outcome === "completed" ? "success" : "warning",
              },
            },
      );
    }, 300);
  }
  function sourceTestLabel(s: Source | WebSource) {
    const result = toolTests[s.id];
    return result?.fingerprint === toolFingerprint(s)
      ? result.text
      : "尚未测试";
  }
  function moveSearch(index: number, offset: number) {
    const next = [...webSources];
    [next[index], next[index + offset]] = [next[index + offset], next[index]];
    queueSave("保存搜索顺序", () => {
      setWebSources(next);
      setStatus("搜索顺序已保存，下次任务生效");
    });
  }
  function maintenance(
    action: "update" | "restore" | "overlay" | "remove" | "diagnostic",
  ) {
    if (pendingSave) return;
    if (action === "diagnostic" && diagnosticOutcome === "cancelled") {
      setMaintenanceStatus((s) => ({
        ...s,
        diagnostic: "已取消，未生成诊断文件",
      }));
      return;
    }
    const outcome = maintenanceOutcome,
      file = overlayOutcome,
      exportResult = diagnosticOutcome;
    queueSave("维护操作", () => {
      const section =
        action === "update" || action === "restore"
          ? "directory"
          : action === "diagnostic"
            ? "diagnostic"
            : "overlay";
      let text = "";
      if (
        outcome === "failed" ||
        (action === "diagnostic" && exportResult === "failed")
      )
        text = "操作失败，已采用内容和配置保留，可重试";
      else if (action === "update") {
        setPreviousCatalog(catalogVersion);
        setCatalogVersion(catalogVersion + 1);
        text = "公共目录检查完成，已采用新版本；连接目标与默认用途保留";
      } else if (action === "restore") {
        setCatalogVersion(previousCatalog!);
        setPreviousCatalog(catalogVersion);
        setAutoUpdate(false);
        text = "上一份目录已恢复，自动更新已关闭";
      } else if (action === "overlay" && file !== "valid")
        text =
          file === "missing"
            ? "找不到源文件，最后成功采用的补充信息保留"
            : "文件校验失败，最后成功采用的补充信息保留";
      else if (action === "overlay") {
        setOverlay(true);
        text = "补充信息已采用：新增 1，更新 2；请在模型卡片查看可用状态";
      } else if (action === "remove") {
        setOverlay(false);
        text = "已移除补充信息，连接及默认用途保留";
      } else text = "脱敏全局诊断已导出，无账户凭据或会话正文";
      setMaintenanceStatus((s) => ({ ...s, [section]: text }));
      setStatus(text);
    });
  }
  function mcpPage() {
    return (
      <>
        <Header
          title="MCP 工具"
          description="管理外部工具服务。保存配置后，下次任务生效。"
          action={
            <Button primary onClick={() => editSource(newSource())}>
              ＋ 添加来源
            </Button>
          }
        />
        <div class="page-content stack">
          <>
            <div class="row wrap">
              <Button onClick={() => openJson("edit")}>编辑 JSON</Button>
              <Button onClick={() => openJson("import")}>导入配置</Button>
              <Button
                disabled={!sources.length}
                onClick={() => openJson("export")}
              >
                导出配置
              </Button>
            </div>
            {!sources.length && (
              <div class="empty">
                <div class="empty-symbol">＋</div>
                <h2>添加外部工具</h2>
                <p>填写 MCP 服务地址或本机程序，保存即可使用。</p>
                <Button primary onClick={() => editSource(newSource())}>
                  添加 MCP 来源
                </Button>
              </div>
            )}
            {sources.map((s) => (
              <article key={s.id} class="card stack mcp-source-card">
                <div class="row spread wrap">
                  <div>
                    <h3>{s.label}</h3>
                    <small class="muted">
                      {s.transport === "stdio" ? "本机程序" : "HTTP"} ·{" "}
                      {s.address}
                    </small>
                  </div>
                  <label class="switch-label">
                    <input
                      aria-label={s.label + "启用"}
                      type="checkbox"
                      checked={s.enabled}
                      disabled={!!pendingSave}
                      onChange={(e) => {
                        const enabled = e.currentTarget.checked;
                        queueSave("保存来源启用状态", () =>
                          setSources((items) =>
                            items.map((p) =>
                              p.id === s.id ? { ...p, enabled } : p,
                            ),
                          ),
                        );
                      }}
                    />
                    启用
                  </label>
                </div>
                <div class="row spread wrap">
                  <small class="muted">
                    {Object.values({ ...s.headers, ...s.env }).some((v) => !v)
                      ? "认证信息待补充"
                      : sourceTestLabel(s)}
                  </small>
                  <div class="row wrap">
                    <Button
                      small
                      disabled={
                        !!pendingSave ||
                        Object.values({ ...s.headers, ...s.env }).some(
                          (v) => !v,
                        ) ||
                        (toolTests[s.id]?.pending &&
                          toolTests[s.id].fingerprint === toolFingerprint(s))
                      }
                      onClick={() => setSourceTestTarget(s)}
                    >
                      测试连接
                    </Button>
                    <Button small onClick={() => editSource(s)}>
                      编辑来源
                    </Button>
                    <Button small danger onClick={() => setDeleteSource(s)}>
                      移除来源
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </>
        </div>
      </>
    );
  }
  function searchPage() {
    return (
      <>
        <Header
          title="搜索"
          description="管理搜索来源、顺序和测试。保存配置后，下次任务生效。"
        />
        <div class="page-content stack">
          <>
            <div class="banner">
              已启用来源按顺序提供搜索。若当前模型配置支持原生搜索，该配置对应的原生来源优先使用。测试只请求所选来源，不改变启用状态。
            </div>
            <div class="card">
              {webSources.map((s, index) => (
                <article
                  key={s.id}
                  class="source-row search-source-row row spread wrap"
                >
                  <div class="small-stack">
                    <label class="switch-label">
                      <input
                        type="checkbox"
                        aria-label={s.label + "启用"}
                        checked={s.enabled}
                        disabled={!!pendingSave || !validSearch(s)}
                        onChange={(e) => {
                          const enabled = e.currentTarget.checked;
                          queueSave("保存搜索启用状态", () => {
                            setWebSources((items) =>
                              items.map((p) =>
                                p.id === s.id ? { ...p, enabled } : p,
                              ),
                            );
                            setStatus(
                              enabled
                                ? "搜索来源已启用，下次任务生效"
                                : "搜索来源已停用，下次任务生效",
                            );
                          });
                        }}
                      />
                      <strong>{s.label}</strong>
                    </label>
                    <small class="muted">
                      {!validSearch(s) ? "需要配置" : sourceTestLabel(s)}
                      {PI_WEB_SOURCE_BILLABLE.has(s.kind)
                        ? " · 可能产生服务商费用"
                        : ""}
                    </small>
                  </div>
                  <div class="row wrap">
                    <Button
                      small
                      disabled={!!pendingSave || !index}
                      onClick={() => moveSearch(index, -1)}
                    >
                      上移
                    </Button>
                    <Button
                      small
                      disabled={
                        !!pendingSave || index === webSources.length - 1
                      }
                      onClick={() => moveSearch(index, 1)}
                    >
                      下移
                    </Button>
                    <Button small onClick={() => editSearch(s)}>
                      配置
                    </Button>
                    <Button
                      small
                      disabled={
                        !!pendingSave ||
                        !validSearch(s) ||
                        (toolTests[s.id]?.pending &&
                          toolTests[s.id].fingerprint === toolFingerprint(s))
                      }
                      onClick={() => setSourceTestTarget(s)}
                    >
                      测试来源
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          </>
        </div>
      </>
    );
  }
  function catalogModelList(
    provider: string,
    query: string,
    index: number,
    setIndex: (n: number) => void,
    owner?: Connection,
  ) {
    const matches = PUBLIC_MODELS.filter(
      (m) =>
        (!provider || m.provider === provider) &&
        `${m.name} ${m.id} ${providerLabel(m.provider)}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    );
    const pageSize = 12,
      maxPage = Math.max(0, Math.ceil(matches.length / pageSize) - 1),
      current = Math.min(index, maxPage);
    return (
      <section class="stack catalog-results">
        <div class="row spread">
          <small class="muted">
            {matches.length} 个目录模型 · 不代表账户访问权限
          </small>
          <div class="row">
            <Button
              small
              disabled={current === 0}
              onClick={() => setIndex(current - 1)}
            >
              上一页
            </Button>
            <small>
              {current + 1} / {maxPage + 1}
            </small>
            <Button
              small
              disabled={current >= maxPage}
              onClick={() => setIndex(current + 1)}
            >
              下一页
            </Button>
          </div>
        </div>
        <div class="catalog-model-list">
          {matches
            .slice(current * pageSize, (current + 1) * pageSize)
            .map((m) => (
              <div class="catalog-model-row" key={`${m.provider}/${m.id}`}>
                <div class="catalog-model-meta">
                  <strong>{m.name}</strong>
                  <small class="muted">
                    {providerLabel(m.provider)} ·{" "}
                    {m.contextWindow
                      ? `上下文 ${m.contextWindow.toLocaleString()}`
                      : "上下文待确认"}
                  </small>
                </div>
                {owner ? (
                  <Button
                    small
                    disabled={
                      !m.canConfigure ||
                      !!pendingSave ||
                      owner.modelIds.includes(m.id)
                    }
                    onClick={() => {
                      queueSave("模型添加", () => {
                        patchConnection(owner.id, {
                          modelIds: [...owner.modelIds, m.id],
                          modelTargets: {
                            ...owner.modelTargets,
                            [m.id]: modelTarget(owner, m.id),
                          },
                        });
                        setModelOwner(null);
                        setStatus(`已添加「${m.name}」，可在卡片中设置用途`);
                      });
                    }}
                  >
                    {owner.modelIds.includes(m.id)
                      ? "已添加"
                      : m.canConfigure
                        ? "添加"
                        : "当前不可配置"}
                  </Button>
                ) : (
                  <Badge tone={m.canConfigure ? "muted" : "warning"}>
                    {m.canConfigure
                      ? m.requiresServiceParameters
                        ? "可配置 · 需服务商参数"
                        : "可配置"
                      : m.availability === "retired"
                        ? "已退休"
                        : "当前不可配置"}
                  </Badge>
                )}
              </div>
            ))}
        </div>
        {!matches.length && <p class="muted">没有匹配的模型。</p>}
      </section>
    );
  }
  function catalogPage() {
    const provider = PUBLIC_PROVIDERS.find((p) => p.id === catalogProvider);
    return (
      <>
        <Header
          title="模型目录与维护"
          description="浏览预置服务商与模型，管理目录更新和补充信息。"
        />
        <div class="page-content stack">
          <section class="card stack">
            <div class="row spread wrap">
              <h3>预置服务商与模型</h3>
              <Badge>
                {PUBLIC_PROVIDERS.length} 个服务商 · {PUBLIC_MODELS.length}{" "}
                个目录模型
              </Badge>
            </div>
            <label class="field">
              <span>服务商</span>
              <Choice
                label="目录服务商"
                value={catalogProvider}
                options={[
                  { value: "", label: "全部服务商" },
                  ...PUBLIC_PROVIDERS.map((p) => ({
                    value: p.id,
                    label: `${p.label} · ${p.models.length} 个模型${p.canConfigure ? "" : p.needsParameters ? " · 需补充服务商参数" : " · 当前不可配置"}`,
                  })),
                ]}
                onChange={(value) => {
                  setCatalogProvider(value);
                  setCatalogPageIndex(0);
                }}
              />
            </label>
            <Field
              label="搜索目录模型"
              value={catalogQuery}
              onInput={(value) => {
                setCatalogQuery(value);
                setCatalogPageIndex(0);
              }}
            />
            {provider && (
              <div class="row spread wrap">
                <small class="muted">
                  {provider.canConfigure
                    ? "已预置服务地址；添加连接后填写 API Key。"
                    : providerProblem(provider.id)}
                </small>
                <Button
                  small
                  disabled={!provider.canConfigure}
                  onClick={() => addConnection("api-key", provider.id)}
                >
                  添加此服务商连接
                </Button>
              </div>
            )}
            {catalogModelList(
              catalogProvider,
              catalogQuery,
              catalogPageIndex,
              setCatalogPageIndex,
            )}
          </section>
          <details class="card maintenance-section">
            <summary>
              <strong>公共目录更新</strong>
              <Badge>目录版本 {catalogVersion}</Badge>
            </summary>
            <div class="stack maintenance-body">
              <p class="muted">
                更新公共模型信息。账户模型列表请在对应连接中刷新；已保存的连接目标与默认用途保留。
              </p>
              <label class="switch-label">
                <input
                  type="checkbox"
                  checked={autoUpdate}
                  disabled={!!pendingSave}
                  onChange={(e) => {
                    const enabled = e.currentTarget.checked;
                    queueSave("保存自动更新设置", () => setAutoUpdate(enabled));
                  }}
                />
                自动检查目录更新
              </label>
              <div class="row wrap">
                <Button
                  disabled={!!pendingSave}
                  onClick={() => maintenance("update")}
                >
                  检查更新
                </Button>
                <Button
                  disabled={!!pendingSave || previousCatalog === null}
                  onClick={() => maintenance("restore")}
                >
                  恢复上一份
                </Button>
              </div>
              <small class="muted">恢复上一份成功后会关闭自动更新。</small>
              {maintenanceStatus.directory && (
                <div role="status" class="banner">
                  {maintenanceStatus.directory}
                </div>
              )}
            </div>
          </details>
          <details class="card maintenance-section">
            <summary>
              <strong>补充模型信息</strong>
              <Badge>{overlay ? "已采用 models.yml" : "未导入"}</Badge>
            </summary>
            <div class="stack maintenance-body">
              <p class="muted">
                导入 models.yml
                补充模型能力与限制。有效文件会直接采用，可用状态显示在模型卡片中；移除时保留连接及默认用途。
              </p>
              <div class="row wrap">
                <Button
                  disabled={!!pendingSave}
                  onClick={() => maintenance("overlay")}
                >
                  导入 models.yml
                </Button>
                <Button
                  disabled={!!pendingSave || !overlay}
                  onClick={() => maintenance("overlay")}
                >
                  刷新文件
                </Button>
                <Button
                  disabled={!!pendingSave || !overlay}
                  danger
                  onClick={() => maintenance("remove")}
                >
                  移除补充信息
                </Button>
              </div>
              {maintenanceStatus.overlay && (
                <div role="status" class="banner">
                  {maintenanceStatus.overlay}
                </div>
              )}
            </div>
          </details>
          <details class="card maintenance-section">
            <summary>
              <strong>故障诊断</strong>
              <Badge>按需导出</Badge>
            </summary>
            <div class="stack maintenance-body">
              <p class="muted">
                选择保存位置，导出脱敏的全局运行记录。包含目录与来源状态，不包含账户凭据或会话正文。
              </p>
              <div>
                <Button
                  disabled={!!pendingSave}
                  onClick={() => maintenance("diagnostic")}
                >
                  导出诊断
                </Button>
              </div>
              {maintenanceStatus.diagnostic && (
                <div role="status" class="banner">
                  {maintenanceStatus.diagnostic}
                </div>
              )}
            </div>
          </details>
        </div>
      </>
    );
  }
  const editorRegistration = registrations.find(
    (r) => r.id === editing?.registrationId,
  );
  const effectiveDraft = editing && {
    ...editing,
    keySaved: editing.keySaved || !!secret.trim(),
  };
  const canSaveConnection =
    !!editing?.label.trim() &&
    !pendingSave &&
    (!editing.repairRequired || acceptRepair) &&
    auth?.ownerId !== editing.id &&
    (editing.kind === "chatgpt" ||
      !editing.needsKey ||
      effectiveDraft?.keySaved) &&
    (editing.kind !== "custom" || validEndpoint(editing.endpoint)) &&
    (editing.kind !== "api-key" ||
      PUBLIC_PROVIDERS.some(
        (p) =>
          p.id === editing.provider &&
          p.canConfigure &&
          (!p.needsParameters ||
            (!!editing.serviceAccount.trim() &&
              (p.id !== "cloudflare-ai-gateway" ||
                !!editing.serviceGateway.trim()))),
      ));
  const editingExisting =
    !!editing && connections.some((c) => c.id === editing.id);
  const totalSnapshot = {
    revision: 7,
    opened,
    page,
    connections,
    registrations,
    defaults,
    modelReasoning,
    editing,
    auth,
    requestOutcome,
    testResult,
    pendingSave,
    leave,
    saveOutcome,
    discoveryOutcome,
    discardedAuth,
    sources,
    webSources,
    toolTests,
    toolLeave,
    sourceEditorOpen: !!sourceDraft,
    jsonEditorMode: jsonEditor?.mode,
    searchEditorOpen: !!searchDraft,
    maintenanceStatus,
    catalog: {
      autoUpdate,
      version: catalogVersion,
      previousVersion: previousCatalog,
      overlay,
      providers: PUBLIC_PROVIDERS.length,
      models: PUBLIC_MODELS.length,
      catalogProvider,
      catalogQuery,
      catalogPageIndex,
    },
    modelOwner,
    status,
  };
  return (
    <div class="prototype-page">
      <header class="review-header row spread wrap">
        <div>
          <span class="prototype-label">INTERACTION PROTOTYPE · 设计评审</span>
          <h1>Zotero Agent 独立配置窗口</h1>
          <p class="muted">
            第七版 · MCP 条目与认证引导 · 所有登录、保存、发现和调用均为模拟
          </p>
        </div>
        <Button small onClick={() => setDark(!dark)}>
          {dark ? "浅色" : "深色"}
        </Button>
      </header>
      <div class="prefs-context row spread">
        <strong>偏好设置 › 后端</strong>
        <div class="row">
          <Button onClick={() => setOpened(true)}>配置 Zotero Agent</Button>
          <Button
            onClick={() =>
              setStatus(
                "现有后端管理器继续管理 ACP、SkillRunner 和 Generic HTTP",
              )
            }
          >
            打开后端管理器
          </Button>
        </div>
      </div>
      <div class="review-controls">
        <strong>评审场景</strong>
        <select
          aria-label="评审场景"
          value={scenario}
          onChange={(e) => scenarioLoad(e.currentTarget.value)}
        >
          {[
            ["empty", "首次使用 · 零连接"],
            ["multi", "日常使用 · 多连接 / 同邮箱不同空间"],
            ["permission", "已登录 · 缺少方案权限"],
            ["welcome", "已登录 · 待确认使用说明"],
            ["paused", "额度暂停"],
            ["reauthorize", "需要重新授权"],
            ["signedout", "已退出登录"],
            ["discovery", "模型刷新失败"],
            ["unknown", "模型能力信息不足"],
            ["empty-models", "账户返回空模型列表"],
            ["repair", "连接目标需要确认"],
            ["no-default", "已有连接 · 尚未设置默认模型"],
          ].map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <Button small onClick={() => scenarioLoad(scenario)}>
          重置场景
        </Button>
        <Button small onClick={() => setCompact(!compact)}>
          {compact ? "1180 × 700" : "900 × 600"}
        </Button>
        <label>
          模拟测试结果{" "}
          <select
            aria-label="模拟测试结果"
            value={requestOutcome}
            onChange={(e) => setRequestOutcome(e.currentTarget.value)}
          >
            <option value="completed">实际完成</option>
            <option value="failed">请求失败</option>
            <option value="incomplete">仅部分响应</option>
          </select>
        </label>
        <label>
          模拟保存{" "}
          <select
            aria-label="模拟保存结果"
            value={saveOutcome}
            onChange={(e) => setSaveOutcome(e.currentTarget.value)}
          >
            <option value="success">成功</option>
            <option value="failed">失败</option>
          </select>
        </label>
        <label>
          模拟发现{" "}
          <select
            aria-label="模拟模型发现结果"
            value={discoveryOutcome}
            onChange={(e) => setDiscoveryOutcome(e.currentTarget.value)}
          >
            <option value="ready">完整模型</option>
            <option value="failed">刷新失败</option>
            <option value="empty">成功空列表</option>
            <option value="unknown">能力信息不足</option>
          </select>
        </label>
        <label>
          模拟撤销{" "}
          <select
            aria-label="模拟远端撤销结果"
            value={revocationOutcome}
            onChange={(e) => setRevocationOutcome(e.currentTarget.value)}
          >
            <option value="unknown">未确认</option>
            <option value="confirmed">已确认</option>
          </select>
        </label>
        <label>
          模拟维护{" "}
          <select
            aria-label="模拟维护结果"
            value={maintenanceOutcome}
            onChange={(e) => setMaintenanceOutcome(e.currentTarget.value)}
          >
            <option value="success">成功</option>
            <option value="failed">失败</option>
          </select>
        </label>
        <label>
          模拟补充文件{" "}
          <select
            aria-label="模拟补充文件"
            value={overlayOutcome}
            onChange={(e) => setOverlayOutcome(e.currentTarget.value)}
          >
            <option value="valid">有效</option>
            <option value="invalid">无效</option>
            <option value="missing">丢失</option>
          </select>
        </label>
        <label>
          模拟诊断导出{" "}
          <select
            aria-label="模拟诊断导出"
            value={diagnosticOutcome}
            onChange={(e) => setDiagnosticOutcome(e.currentTarget.value)}
          >
            <option value="saved">保存</option>
            <option value="cancelled">取消</option>
            <option value="failed">失败</option>
          </select>
        </label>
        {discardedAuth && (
          <Button
            small
            onClick={() =>
              setStatus("已拒绝已取消请求的迟到回调；账户与连接保持原状态")
            }
          >
            迟到登录回调
          </Button>
        )}
        {auth && (
          <>
            <span class="prototype-label">模拟浏览器回调</span>
            <Button
              small
              onClick={() => setAuth({ ...auth, phase: "exchange" })}
            >
              交换授权
            </Button>
            <Button small onClick={() => setAuth({ ...auth, phase: "verify" })}>
              验证账户
            </Button>
            <Button small onClick={() => completeLogin("success")}>
              登录成功
            </Button>
            <Button small onClick={() => completeLogin("permission")}>
              缺少权限
            </Button>
            <Button small onClick={() => completeLogin("failed")}>
              登录失败
            </Button>
            <Button small onClick={() => completeLogin("expired")}>
              登录超时
            </Button>
          </>
        )}
      </div>
      {opened ? (
        <section
          class={`window${compact ? " compact" : ""}`}
          aria-label="Zotero Agent 配置窗口"
        >
          <div class="window-titlebar row spread">
            <strong>Zotero Agent · 配置</strong>
            <button
              type="button"
              class="button quiet"
              aria-label="关闭配置窗口"
              disabled={!!pendingSave}
              onClick={() => requestLeave({ kind: "close" })}
            >
              ×
            </button>
          </div>
          <div
            class="window-layout"
            inert={
              !!(
                editing ||
                addOpen ||
                sourceDraft ||
                jsonEditor ||
                searchDraft ||
                toolLeave ||
                deleteSource ||
                sourceTestTarget ||
                modelOwner ||
                deleteTarget ||
                deleteModel ||
                authRemoval ||
                testTarget ||
                leave
              )
            }
          >
            <nav class="sidebar" aria-label="配置导航">
              <div class="sidebar-brand">Zotero Agent</div>
              <button
                type="button"
                class={`nav${page === "overview" ? " active" : ""}`}
                onClick={() => setPage("overview")}
              >
                <span>◎</span>开始使用
              </button>
              <div class="nav-group">模型</div>
              {(
                [["connections", "↗", "模型工作台"]] as [Page, string, string][]
              ).map(([key, symbol, name]) => (
                <button
                  type="button"
                  key={key}
                  class={`nav${page === key ? " active" : ""}`}
                  onClick={() => setPage(key)}
                >
                  <span>{symbol}</span>
                  {name}
                  {key === "connections" && (
                    <span class="number">{connections.length}</span>
                  )}
                </button>
              ))}
              <div class="nav-group">扩展</div>
              <button
                type="button"
                class={`nav${page === "mcp" ? " active" : ""}`}
                onClick={() => setPage("mcp")}
              >
                <span>⊞</span>MCP
              </button>
              <button
                type="button"
                class={`nav${page === "search" ? " active" : ""}`}
                onClick={() => setPage("search")}
              >
                <span>⌕</span>搜索
              </button>
              <div class="nav-group">高级</div>
              <button
                type="button"
                class={`nav${page === "catalog" ? " active" : ""}`}
                onClick={() => setPage("catalog")}
              >
                <span>≡</span>目录与维护
              </button>
              <div class="sidebar-foot">模型连接和工具来源独立管理。</div>
            </nav>
            <main class="main">
              {page === "overview"
                ? overviewPage()
                : page === "connections"
                  ? connectionsPage()
                  : page === "mcp"
                    ? mcpPage()
                    : page === "search"
                      ? searchPage()
                      : catalogPage()}
            </main>
          </div>
          <footer class="window-status" role="status">
            {status}
          </footer>
          {addOpen && (
            <Modal
              title="添加模型连接"
              footer={<Button onClick={() => setAddOpen(false)}>取消</Button>}
            >
              {(["chatgpt", "api-key", "custom"] as Kind[]).map((kind) => (
                <button
                  type="button"
                  class="setup-choice"
                  key={kind}
                  onClick={() => addConnection(kind)}
                >
                  <span class="brand-icon">
                    {kind === "chatgpt" ? "C" : "API"}
                  </span>
                  <span>
                    <strong>{KIND_LABEL[kind]}</strong>
                    <small>
                      {kind === "chatgpt"
                        ? "使用 ChatGPT 方案登录"
                        : kind === "api-key"
                          ? "使用模型服务的 API Key"
                          : "兼容接口或本地服务"}
                    </small>
                  </span>
                  <span style={{ marginLeft: "auto" }}>→</span>
                </button>
              ))}
            </Modal>
          )}
          {editing && !leave && !authRemoval && (
            <Modal
              title={
                editingExisting
                  ? `管理连接 · ${editing.label}`
                  : `添加连接 · ${KIND_LABEL[editing.kind]}`
              }
              footer={
                <>
                  <span class="muted">
                    {editingExisting
                      ? "编辑后保存连接"
                      : "完成连接后再选择模型"}
                  </span>
                  <Button disabled={!!pendingSave} onClick={closeEditor}>
                    {editingExisting ? "取消编辑" : "取消"}
                  </Button>
                  <Button
                    primary
                    disabled={!canSaveConnection}
                    onClick={() => saveConnection()}
                  >
                    {pendingSave ? "保存中…" : "保存连接"}
                  </Button>
                </>
              }
            >
              <fieldset class="editor-fields stack" disabled={!!pendingSave}>
                {editingExisting && connections.length > 1 && (
                  <label class="field">
                    <span>切换编辑连接</span>
                    <Choice
                      label="切换编辑连接"
                      value={editing.id}
                      disabled={!!pendingSave}
                      options={connections.map((c) => ({
                        value: c.id,
                        label: c.label,
                      }))}
                      onChange={(connectionId) =>
                        connectionId !== editing.id &&
                        requestLeave({ kind: "switch", connectionId })
                      }
                    />
                  </label>
                )}
                {editing.repairRequired && (
                  <div class="banner warning">
                    <strong>连接目标需要确认</strong>
                    <p>
                      确认此连接的服务地址后才能用于新任务；原模型和默认用途保留。
                    </p>
                    <label class="switch-label">
                      <input
                        type="checkbox"
                        checked={acceptRepair}
                        onChange={(e) =>
                          setAcceptRepair(e.currentTarget.checked)
                        }
                      />
                      确认使用此服务商的连接目标
                    </label>
                  </div>
                )}
                <Field
                  label="连接名称"
                  value={editing.label}
                  onInput={(label) => setEditing({ ...editing, label })}
                />
                {editing.kind === "chatgpt" ? (
                  <>
                    <label class="field">
                      <span>ChatGPT 账户与空间</span>
                      <Choice
                        label="ChatGPT 账户与空间"
                        value={editing.registrationId || ""}
                        disabled={!!auth}
                        options={[
                          { value: "", label: "连接新账户或空间" },
                          ...registrations.map((r) => ({
                            value: r.id,
                            label: `${r.email} · ${r.workspace}${r.signedIn ? "" : " · 已退出"}`,
                          })),
                        ]}
                        onChange={(registrationId) => {
                          discoveryFlights.current.delete(editing.id);
                          setRegistrationLabel(
                            registrations.find((r) => r.id === registrationId)
                              ?.label || "",
                          );
                          const bound = connections.find(
                            (c) =>
                              c.registrationId === registrationId &&
                              c.factsIdentity ===
                                registrations.find(
                                  (r) => r.id === registrationId,
                                )?.identity,
                          );
                          const draft: Connection = {
                            ...editing,
                            registrationId: registrationId || undefined,
                            discovery: bound?.discovery || "idle",
                            modelIds: [
                              ...new Set([
                                ...editing.modelIds,
                                ...(bound?.modelIds || []),
                              ]),
                            ],
                            factsIdentity: bound?.factsIdentity,
                          };
                          setEditing(draft);
                          if (registrationId) refreshModels(draft);
                        }}
                      />
                    </label>
                    {editorRegistration && (
                      <Field
                        label="注册辨识名称"
                        value={registrationLabel}
                        onInput={setRegistrationLabel}
                        help="用于区分同邮箱的不同授权空间；随保存操作更新。"
                      />
                    )}
                    {accountBlock(editing)}
                    {editorRegistration?.signedIn && modelBlock(editing)}
                  </>
                ) : (
                  <>
                    {editing.kind === "api-key" && (
                      <label class="field">
                        <span>模型服务</span>
                        <Choice
                          label="模型服务"
                          value={editing.provider}
                          disabled={editingExisting}
                          options={PUBLIC_PROVIDERS.map((p) => ({
                            value: p.id,
                            label: `${p.label} · ${p.models.length} 个目录模型${p.canConfigure ? "" : p.needsParameters ? " · 需补充服务商参数" : " · 当前不可配置"}`,
                            disabled: !p.canConfigure,
                          }))}
                          onChange={(provider) => {
                            setSecret("");
                            setEditing({
                              ...editing,
                              provider,
                              modelIds: [],
                              keySaved: false,
                              label: providerLabel(provider),
                            });
                          }}
                        />
                      </label>
                    )}
                    {editing.kind === "api-key" &&
                      PUBLIC_PROVIDERS.find((p) => p.id === editing.provider)
                        ?.needsParameters && (
                        <>
                          <Field
                            label="Cloudflare 账户 ID"
                            value={editing.serviceAccount}
                            onInput={(serviceAccount) =>
                              setEditing({ ...editing, serviceAccount })
                            }
                          />
                          {editing.provider === "cloudflare-ai-gateway" && (
                            <Field
                              label="网关 ID"
                              value={editing.serviceGateway}
                              onInput={(serviceGateway) =>
                                setEditing({ ...editing, serviceGateway })
                              }
                            />
                          )}
                          <p class="muted">
                            服务地址：{resolvedEndpoint(editing)}
                          </p>
                        </>
                      )}
                    {editing.kind === "custom" && (
                      <>
                        <Field
                          label="服务地址"
                          value={editing.endpoint}
                          onInput={(endpoint) =>
                            setEditing({
                              ...editing,
                              endpoint,
                              localApproved: false,
                            })
                          }
                        />
                        <label class="field">
                          <span>接口类型</span>
                          <Choice
                            label="接口类型"
                            value={editing.dialect}
                            options={[
                              { value: "Responses", label: "OpenAI Responses" },
                              {
                                value: "Completions",
                                label: "OpenAI Chat Completions",
                              },
                            ]}
                            onChange={(dialect) =>
                              setEditing({ ...editing, dialect })
                            }
                          />
                        </label>
                        <label class="switch-label">
                          <input
                            type="checkbox"
                            checked={!editing.needsKey}
                            onChange={(e) =>
                              setEditing({
                                ...editing,
                                needsKey: !e.currentTarget.checked,
                              })
                            }
                          />
                          此服务无需密钥
                        </label>
                        {isLocal(editing.endpoint) && (
                          <div class="banner warning">
                            <label class="switch-label">
                              <input
                                type="checkbox"
                                checked={editing.localApproved}
                                onChange={(e) =>
                                  setEditing({
                                    ...editing,
                                    localApproved: e.currentTarget.checked,
                                  })
                                }
                              />
                              允许连接此本地模型服务
                            </label>
                            <p>{editing.endpoint}</p>
                          </div>
                        )}
                      </>
                    )}
                    {editing.needsKey && (
                      <Field
                        label={editing.keySaved ? "替换 API Key" : "API Key"}
                        value={secret}
                        type="password"
                        help={
                          editing.keySaved
                            ? "已保存密钥；留空保留原密钥。"
                            : "密钥仅用于此模型服务。"
                        }
                        onInput={setSecret}
                      />
                    )}
                    <div class="banner">
                      保存连接后获取模型，在模型卡片中设置默认用途。
                    </div>
                  </>
                )}
                {editingExisting && (
                  <p class="muted">
                    保存影响调用的修改后，返回模型卡片测试；默认用途保留。
                  </p>
                )}
              </fieldset>
            </Modal>
          )}
          {sourceDraft && !toolLeave && (
            <Modal
              title="MCP 来源"
              footer={
                <>
                  <Button
                    disabled={!!pendingSave}
                    onClick={() => requestToolLeave("cancel")}
                  >
                    取消
                  </Button>
                  <Button
                    primary
                    disabled={
                      !!pendingSave ||
                      !sourceCandidate().source ||
                      !validSource(sourceCandidate().source!)
                    }
                    onClick={() => saveToolEdit()}
                  >
                    保存来源
                  </Button>
                </>
              }
            >
              <fieldset class="editor-fields stack" disabled={!!pendingSave}>
                <Field
                  label="来源名称"
                  value={sourceDraft.label}
                  onInput={(label) => setSourceDraft({ ...sourceDraft, label })}
                />
                <label class="field">
                  <span>连接方式</span>
                  <Choice
                    label="MCP 连接方式"
                    value={sourceDraft.transport}
                    options={[
                      { value: "HTTPS", label: "HTTP / HTTPS" },
                      { value: "stdio", label: "本机程序（stdio）" },
                    ]}
                    onChange={(transport) =>
                      loadSourceEditor(
                        {
                          ...newSource(sourceDraft.id),
                          label: sourceDraft.label,
                          enabled: sourceDraft.enabled,
                          transport: transport as Source["transport"],
                        },
                        false,
                      )
                    }
                  />
                </label>
                <Field
                  label={
                    sourceDraft.transport === "stdio"
                      ? "可执行程序（绝对路径）"
                      : "服务地址"
                  }
                  value={sourceDraft.address}
                  onInput={(address) =>
                    setSourceDraft({ ...sourceDraft, address, approved: false })
                  }
                />
                {sourceDraft.transport === "stdio" ? (
                  <>
                    <section class="small-stack argument-editor">
                      <div class="row spread wrap">
                        <strong>程序参数</strong>
                        <Button
                          small
                          onClick={() =>
                            setSourceDraft({
                              ...sourceDraft,
                              args: [...sourceDraft.args, ""],
                            })
                          }
                        >
                          添加参数
                        </Button>
                      </div>
                      <small class="muted">
                        每个条目填写一个参数；包含空格的路径可直接填写，无需加引号。
                      </small>
                      {sourceDraft.args.map((value, index) => (
                        <div key={index} class="argument-entry">
                          <Field
                            label={"参数 " + (index + 1)}
                            value={value}
                            onInput={(value) =>
                              setSourceDraft({
                                ...sourceDraft,
                                args: sourceDraft.args.map((arg, i) =>
                                  i === index ? value : arg,
                                ),
                              })
                            }
                          />
                          <Button
                            small
                            onClick={() =>
                              setSourceDraft({
                                ...sourceDraft,
                                args: sourceDraft.args.filter(
                                  (_, i) => i !== index,
                                ),
                              })
                            }
                          >
                            移除参数 {index + 1}
                          </Button>
                        </div>
                      ))}
                    </section>
                    <Field
                      label="工作目录（可选）"
                      value={sourceDraft.cwd}
                      placeholder="默认：Zotero Agent 运行目录"
                      help={
                        !sourceDraft.cwd
                          ? "留空使用 Zotero Agent 运行目录。"
                          : "填写程序启动时使用的绝对路径。"
                      }
                      onInput={(cwd) => setSourceDraft({ ...sourceDraft, cwd })}
                    />
                    <BindingEntries
                      label="环境变量"
                      addLabel="添加环境变量"
                      entries={sourceEnv}
                      onChange={setSourceEnv}
                    />
                  </>
                ) : (
                  <>
                    {isLocal(sourceDraft.address) && (
                      <label class="switch-label">
                        <input
                          type="checkbox"
                          checked={sourceDraft.approved}
                          onChange={(e) =>
                            setSourceDraft({
                              ...sourceDraft,
                              approved: e.currentTarget.checked,
                            })
                          }
                        />
                        允许访问此本地工具服务
                      </label>
                    )}
                    <label class="field">
                      <span>认证方式</span>
                      <Choice
                        label="MCP 认证方式"
                        value={sourceAuth}
                        options={[
                          { value: "none", label: "无需认证" },
                          { value: "bearer", label: "Bearer token" },
                          { value: "api-key", label: "API Key" },
                          { value: "custom", label: "其他认证（高级）" },
                        ]}
                        onChange={(kind) =>
                          changeSourceAuth(
                            kind as NonNullable<Source["httpAuth"]>,
                          )
                        }
                      />
                    </label>
                    {sourceAuth === "api-key" && (
                      <>
                        <label class="field">
                          <span>API Key 类型</span>
                          <Choice
                            label="API Key 类型"
                            value={sourceApiHeader}
                            options={[
                              {
                                value: "X-API-Key",
                                label: "X-API-Key（常用）",
                              },
                              { value: "api-key", label: "api-key" },
                              { value: "custom", label: "服务商指定名称" },
                            ]}
                            onChange={(value) => {
                              setSourceApiHeader(value);
                              setSourceToken("");
                            }}
                          />
                        </label>
                        {sourceApiHeader === "custom" && (
                          <Field
                            label="服务商指定的字段名称"
                            value={sourceCustomHeader}
                            placeholder="例如 X-Service-Key"
                            onInput={setSourceCustomHeader}
                          />
                        )}
                      </>
                    )}
                    {(sourceAuth === "bearer" || sourceAuth === "api-key") && (
                      <Field
                        label={
                          sourceAuth === "bearer"
                            ? "鉴权 token"
                            : "认证 API Key"
                        }
                        type="password"
                        value={sourceToken}
                        placeholder={
                          sourceStoredToken()
                            ? "已保存，留空保留"
                            : sourceAuth === "bearer"
                              ? "填入服务提供的 token"
                              : "填入服务提供的 API Key"
                        }
                        help={
                          sourceAuth === "bearer"
                            ? "只填 token，无需添加 Bearer 前缀。已保存时留空保留，填写新值可替换。"
                            : "填写 API Key 原文；已有密钥留空保留。"
                        }
                        onInput={setSourceToken}
                      />
                    )}
                    <details
                      class="mcp-advanced"
                      open={sourceAuth === "custom" || undefined}
                    >
                      <summary>高级：其他请求头</summary>
                      <BindingEntries
                        label="额外请求头"
                        addLabel="添加请求头条目"
                        entries={sourceHeaders}
                        onChange={setSourceHeaders}
                      />
                    </details>
                  </>
                )}
                {sourceCandidate().error && (
                  <div class="banner warning">{sourceCandidate().error}</div>
                )}
                <div class="banner">
                  保存后可供后续任务使用。需要排查连接时，可在来源卡片上测试。
                </div>
                {status.includes("保存失败") && (
                  <div class="banner warning">{status}</div>
                )}
              </fieldset>
            </Modal>
          )}
          {jsonEditor && !toolLeave && (
            <Modal
              wide
              title={
                jsonEditor.mode === "export"
                  ? "导出 MCP 配置"
                  : jsonEditor.mode === "import"
                    ? "导入 MCP 配置"
                    : "编辑 MCP JSON"
              }
              footer={
                jsonEditor.mode === "export" ? (
                  <Button onClick={() => finishToolEdit()}>完成</Button>
                ) : (
                  <>
                    <Button
                      disabled={!!pendingSave}
                      onClick={() => requestToolLeave("cancel")}
                    >
                      取消
                    </Button>
                    <Button
                      primary
                      disabled={
                        !!pendingSave ||
                        !!jsonPlan().error ||
                        jsonPlan().next.some((s) => !validSource(s))
                      }
                      onClick={() => saveToolEdit()}
                    >
                      {jsonEditor.mode === "import"
                        ? "合并并保存"
                        : "保存 JSON"}
                    </Button>
                  </>
                )
              }
            >
              <fieldset class="editor-fields stack" disabled={!!pendingSave}>
                <p class="muted">
                  {jsonEditor.mode === "export"
                    ? "复制连接结构。认证字段留空，导入后需要重新录入。"
                    : jsonEditor.mode === "import"
                      ? "粘贴整份 mcpServers 配置。新来源加入，同名来源默认保留现有。"
                      : "编辑整份 mcpServers，与表单共用配置。已有认证留空表示保留，不回填明文。"}
                </p>
                <label class="field">
                  <span>mcpServers JSON</span>
                  <textarea
                    class="code-input registry-json"
                    rows={12}
                    aria-label="mcpServers JSON"
                    readOnly={jsonEditor.mode === "export"}
                    value={jsonEditor.text}
                    onInput={(e) =>
                      setJsonEditor({
                        ...jsonEditor,
                        text: e.currentTarget.value,
                      })
                    }
                    spellcheck={false}
                  />
                </label>
                {jsonEditor.mode !== "export" && (
                  <>
                    {jsonPlan().error ? (
                      <div role="status" class="banner warning">
                        {jsonPlan().error}
                      </div>
                    ) : (
                      <>
                        {jsonEditor.mode === "import" &&
                          jsonPlan()
                            .parsed.filter((p) =>
                              sources.some((s) => s.id === p.id),
                            )
                            .map((p) => (
                              <label key={p.id} class="switch-label">
                                <input
                                  type="checkbox"
                                  aria-label={"替换来源 " + p.id}
                                  checked={jsonEditor.replace.includes(p.id)}
                                  onChange={(e) =>
                                    setJsonEditor({
                                      ...jsonEditor,
                                      replace: e.currentTarget.checked
                                        ? [...jsonEditor.replace, p.id]
                                        : jsonEditor.replace.filter(
                                            (id) => id !== p.id,
                                          ),
                                    })
                                  }
                                />
                                替换「{p.label}」的现有配置（默认保留）
                              </label>
                            ))}
                        {jsonPlan()
                          .next.filter(
                            (p) =>
                              p.transport === "HTTPS" && isLocal(p.address),
                          )
                          .map((p) => (
                            <label key={p.id} class="switch-label">
                              <input
                                type="checkbox"
                                aria-label={"允许本地来源 " + p.id}
                                checked={p.approved}
                                disabled={sources.some(
                                  (s) =>
                                    s.id === p.id &&
                                    s.address === p.address &&
                                    s.approved,
                                )}
                                onChange={(e) =>
                                  setJsonEditor({
                                    ...jsonEditor,
                                    grants: e.currentTarget.checked
                                      ? [...jsonEditor.grants, p.id]
                                      : jsonEditor.grants.filter(
                                          (id) => id !== p.id,
                                        ),
                                  })
                                }
                              />
                              允许访问 {p.address}
                            </label>
                          ))}
                        <div class="banner config-summary">
                          保存影响：新增 {jsonPlan().added} · 修改{" "}
                          {jsonPlan().changed} · 移除 {jsonPlan().removed}
                        </div>
                        {jsonPlan().next.some((s) => !validSource(s)) && (
                          <small class="muted">
                            请检查服务地址、程序绝对路径及本地访问授权。
                          </small>
                        )}
                      </>
                    )}
                  </>
                )}
                {status.includes("保存失败") && (
                  <div class="banner warning">{status}</div>
                )}
              </fieldset>
            </Modal>
          )}
          {searchDraft && !toolLeave && (
            <Modal
              title={"配置 " + searchDraft.label}
              footer={
                <>
                  <Button
                    disabled={!!pendingSave}
                    onClick={() => requestToolLeave("cancel")}
                  >
                    取消
                  </Button>
                  <Button
                    primary
                    disabled={
                      !!pendingSave ||
                      !validSearch({
                        ...searchDraft,
                        credentialId: searchSecret.trim()
                          ? "draft-key"
                          : searchDraft.credentialId,
                      }) ||
                      (() => {
                        try {
                          stringArgs(searchArgs);
                          return false;
                        } catch {
                          return true;
                        }
                      })()
                    }
                    onClick={() => saveToolEdit()}
                  >
                    保存搜索配置
                  </Button>
                </>
              }
            >
              <fieldset class="editor-fields stack" disabled={!!pendingSave}>
                {searchDraft.kind.endsWith("-native") ? (
                  <>
                    <label class="field">
                      <span>模型连接</span>
                      <Choice
                        label="搜索使用的连接"
                        value={searchDraft.connectionId}
                        options={[
                          { value: "", label: "选择已保存的模型连接" },
                          ...nativeConnections(searchDraft).map((c) => ({
                            value: c.id,
                            label: c.label,
                          })),
                        ]}
                        onChange={(connectionId) =>
                          setSearchDraft({
                            ...searchDraft,
                            connectionId,
                            modelId: "",
                          })
                        }
                      />
                    </label>
                    {!nativeConnections(searchDraft).length && (
                      <div class="banner">
                        尚无适用连接。请先在模型工作台添加此服务商连接。
                      </div>
                    )}
                    <label class="field">
                      <span>搜索模型</span>
                      <Choice
                        label="搜索模型"
                        value={searchDraft.modelId}
                        options={[
                          { value: "", label: "选择搜索模型" },
                          ...(
                            nativeConnections(searchDraft).find(
                              (c) => c.id === searchDraft.connectionId,
                            )?.modelIds || []
                          )
                            .slice(0, 4)
                            .map((modelId) => ({
                              value: modelId,
                              label:
                                MODELS.find((m) => m.id === modelId)?.name ||
                                modelId,
                            })),
                        ]}
                        onChange={(modelId) =>
                          setSearchDraft({ ...searchDraft, modelId })
                        }
                      />
                    </label>
                    <small class="muted">
                      复用该连接的账户与凭据，搜索模型单独选择。
                    </small>
                  </>
                ) : searchDraft.kind === "exa-mcp" ? (
                  <p class="muted">
                    Exa 已提供预置搜索服务，可直接测试或调整启用状态。
                  </p>
                ) : (
                  <>
                    {searchDraft.kind === "searxng" ? (
                      <>
                        <Field
                          label="SearXNG 地址"
                          value={searchDraft.endpoint}
                          onInput={(endpoint) =>
                            setSearchDraft({
                              ...searchDraft,
                              endpoint,
                              approved: false,
                            })
                          }
                        />
                        {isLocal(searchDraft.endpoint) && (
                          <label class="switch-label">
                            <input
                              type="checkbox"
                              checked={searchDraft.approved}
                              onChange={(e) =>
                                setSearchDraft({
                                  ...searchDraft,
                                  approved: e.currentTarget.checked,
                                })
                              }
                            />
                            允许访问此本地搜索服务
                          </label>
                        )}
                      </>
                    ) : (
                      <Field
                        label={
                          searchDraft.credentialId
                            ? "替换搜索密钥"
                            : "搜索 API Key"
                        }
                        type="password"
                        value={searchSecret}
                        help={
                          searchDraft.credentialId
                            ? "已有密钥已保存，留空保留。"
                            : "仅用于此搜索来源。"
                        }
                        onInput={setSearchSecret}
                      />
                    )}
                    {searchDraft.kind === "brave-mcp" && (
                      <>
                        <Field
                          label="搜索程序（绝对路径）"
                          value={searchDraft.executable}
                          onInput={(executable) =>
                            setSearchDraft({ ...searchDraft, executable })
                          }
                        />
                        <label class="field">
                          <span>搜索程序参数（JSON 数组）</span>
                          <textarea
                            class="code-input"
                            rows={2}
                            aria-label="搜索程序参数（JSON 数组）"
                            value={searchArgs}
                            onInput={(e) =>
                              setSearchArgs(e.currentTarget.value)
                            }
                          />
                        </label>
                      </>
                    )}
                  </>
                )}
                <div class="banner">
                  保存只更新此来源配置。可以先测试，再启用；常用模型保持当前选择。
                </div>
                {status.includes("保存失败") && (
                  <div class="banner warning">{status}</div>
                )}
              </fieldset>
            </Modal>
          )}
          {toolLeave && (
            <Modal
              title="有未保存的来源配置"
              footer={
                <>
                  <Button
                    disabled={!!pendingSave}
                    onClick={() => setToolLeave(null)}
                  >
                    继续编辑
                  </Button>
                  <Button
                    disabled={!!pendingSave}
                    onClick={() => finishToolEdit(toolLeave === "close")}
                  >
                    放弃修改
                  </Button>
                  <Button
                    primary
                    disabled={
                      !!pendingSave ||
                      (!!sourceDraft &&
                        (!sourceCandidate().source ||
                          !validSource(sourceCandidate().source!))) ||
                      (!!jsonEditor &&
                        (!!jsonPlan().error ||
                          jsonPlan().next.some((s) => !validSource(s)))) ||
                      (!!searchDraft &&
                        !validSearch({
                          ...searchDraft,
                          credentialId: searchSecret.trim()
                            ? "draft-key"
                            : searchDraft.credentialId,
                        }))
                    }
                    onClick={() => saveToolEdit(toolLeave === "close")}
                  >
                    {toolLeave === "close" ? "保存并关闭" : "保存修改"}
                  </Button>
                </>
              }
            >
              <p>保存后继续，或放弃本次修改。已保存的来源配置保留。</p>
              {status.includes("保存失败") && (
                <div class="banner warning">{status}</div>
              )}
            </Modal>
          )}
          {deleteSource && (
            <Modal
              title="移除 MCP 来源"
              footer={
                <>
                  <Button
                    disabled={!!pendingSave}
                    onClick={() => setDeleteSource(null)}
                  >
                    取消
                  </Button>
                  <Button
                    danger
                    disabled={!!pendingSave}
                    onClick={() => {
                      const target = deleteSource;
                      queueSave("移除 MCP 来源", () => {
                        setSources((items) =>
                          items.filter((s) => s.id !== target.id),
                        );
                        setDeleteSource(null);
                        setStatus("来源和专用认证已移除，下次任务生效");
                      });
                    }}
                  >
                    确认移除
                  </Button>
                </>
              }
            >
              <p>
                移除「{deleteSource.label}
                」及其专用认证。之后的任务不再使用它，正在运行任务的结果在任务中查看。
              </p>
            </Modal>
          )}
          {sourceTestTarget && (
            <Modal
              title={"测试 " + sourceTestTarget.label}
              footer={
                <>
                  <Button onClick={() => setSourceTestTarget(null)}>
                    取消
                  </Button>
                  <Button
                    primary
                    onClick={() => testToolSource(sourceTestTarget)}
                  >
                    发送一次来源测试
                  </Button>
                </>
              }
            >
              <p>
                {"kind" in sourceTestTarget
                  ? "仅向此来源发送一次搜索测试，不尝试其他来源，也不改变启用状态。"
                  : sourceTestTarget.transport === "stdio"
                    ? "启动此本机程序并读取工具目录，不执行工具任务。"
                    : "连接此 MCP 服务并读取工具目录，不执行工具任务。"}
              </p>
              {"kind" in sourceTestTarget &&
                PI_WEB_SOURCE_BILLABLE.has(sourceTestTarget.kind) && (
                  <div class="banner warning">此次测试可能产生服务商费用。</div>
                )}
            </Modal>
          )}
          {leave && (
            <Modal
              title="有未保存的修改"
              footer={
                <>
                  <Button
                    disabled={!!pendingSave}
                    onClick={() => setLeave(null)}
                  >
                    继续编辑
                  </Button>
                  <Button
                    disabled={!!pendingSave}
                    onClick={() => finishLeave(leave)}
                  >
                    放弃修改
                  </Button>
                  <Button
                    primary
                    disabled={!canSaveConnection}
                    onClick={() => saveConnection(leave)}
                  >
                    {leave.kind === "close"
                      ? "保存并关闭"
                      : leave.kind === "switch"
                        ? "保存并切换"
                        : "保存并返回"}
                  </Button>
                </>
              }
            >
              <p>
                连接配置尚未保存。已完成的 ChatGPT
                登录会保留；尚在进行的登录将在离开时取消。
              </p>
              {pendingSave && <p role="status">正在保存…</p>}
            </Modal>
          )}
          {testTarget && (
            <Modal
              title={
                registrations.find(
                  (r) => r.id === testTarget.connection.registrationId,
                )?.paused
                  ? "测试并恢复"
                  : "测试此模型"
              }
              footer={
                <>
                  <Button onClick={() => setTestTarget(null)}>取消</Button>
                  <Button primary onClick={runTest}>
                    发送一次测试请求
                  </Button>
                </>
              }
            >
              <strong>
                {testTarget.connection.label} ·{" "}
                {
                  modelsFor(testTarget.connection).find(
                    (m) => m.id === testTarget.modelId,
                  )?.name
                }
              </strong>
              <p>
                将发送一次短推理请求，可能消耗额度。不调用工具，不自动继续已有任务。
              </p>
            </Modal>
          )}
          {authRemoval && (
            <Modal
              title={
                authRemoval.remove ? "移除 ChatGPT 注册" : "退出 ChatGPT 登录"
              }
              footer={
                <>
                  <Button
                    disabled={!!pendingSave}
                    onClick={() => setAuthRemoval(null)}
                  >
                    取消
                  </Button>
                  <Button danger disabled={!!pendingSave} onClick={removeAuth}>
                    {authRemoval.remove ? "移除注册" : "退出登录"}
                  </Button>
                </>
              }
            >
              <strong>
                {authRemoval.registration.label} ·{" "}
                {authRemoval.registration.email} ·{" "}
                {authRemoval.registration.workspace}
              </strong>
              <p>
                下列连接与其模型、默认用途会保留，但需要
                {authRemoval.remove ? "重新绑定注册" : "重新登录"}：
              </p>
              <ul>
                {connections
                  .filter(
                    (c) => c.registrationId === authRemoval.registration.id,
                  )
                  .map((c) => (
                    <li key={c.id}>{c.label}</li>
                  ))}
              </ul>
              <p class="muted">
                将清除本地授权并尝试撤销远端授权；两项结果分别反馈。
              </p>
            </Modal>
          )}
          {deleteModel && (
            <Modal
              title="移除模型配置"
              footer={
                <>
                  <Button
                    disabled={!!pendingSave}
                    onClick={() => setDeleteModel(null)}
                  >
                    保留模型
                  </Button>
                  <Button danger disabled={!!pendingSave} onClick={removeModel}>
                    确认移除模型
                  </Button>
                </>
              }
            >
              <p>
                移除「
                {
                  modelsFor(deleteModel.connection).find(
                    (m) => m.id === deleteModel.modelId,
                  )?.name
                }
                」？连接及凭据保留。
              </p>
              <ul>
                {removalEffects(
                  deleteModel.connection,
                  deleteModel.modelId,
                ).map((effect) => (
                  <li key={effect}>{effect}</li>
                ))}
              </ul>
              {!removalEffects(deleteModel.connection, deleteModel.modelId)
                .length && <p class="muted">没有默认用途引用此模型。</p>}
            </Modal>
          )}
          {deleteTarget && (
            <Modal
              title="移除模型连接"
              footer={
                <>
                  <Button
                    disabled={!!pendingSave}
                    onClick={() => setDeleteTarget(null)}
                  >
                    保留连接
                  </Button>
                  <Button
                    danger
                    disabled={!!pendingSave}
                    onClick={removeConnection}
                  >
                    移除连接
                  </Button>
                </>
              }
            >
              <p>移除「{deleteTarget.label}」？</p>
              <p class="muted">
                此连接的模型卡片一起移除。
                {deleteTarget.kind === "chatgpt"
                  ? "独立账户登录保留。"
                  : connections.some(
                        (c) =>
                          c.id !== deleteTarget.id &&
                          c.credentialId &&
                          c.credentialId === deleteTarget.credentialId,
                      )
                    ? "其他连接仍在使用的密钥保留。"
                    : "此连接独占的 API Key 一并清除。"}
                其他连接保留，已有请求不自动重跑。
              </p>
              <ul>
                {removalEffects(deleteTarget).map((effect) => (
                  <li key={effect}>{effect}</li>
                ))}
              </ul>
              {!removalEffects(deleteTarget).length && (
                <p class="muted">没有默认用途引用此连接。</p>
              )}
            </Modal>
          )}
          {modelOwner && (
            <Modal
              title={`添加模型 · ${providerLabel(modelOwner.provider)}`}
              footer={
                <Button onClick={() => setModelOwner(null)}>返回工作台</Button>
              }
              wide
            >
              <p class="muted">选择需要配置的模型，连接凭据会复用。</p>
              <Field
                label="搜索模型"
                value={modelQuery}
                onInput={(value) => {
                  setModelQuery(value);
                  setModelPage(0);
                }}
              />
              {catalogModelList(
                modelOwner.provider,
                modelQuery,
                modelPage,
                setModelPage,
                modelOwner,
              )}
            </Modal>
          )}
        </section>
      ) : (
        <div class="closed-window">
          <p class="muted">配置窗口已关闭；可从上方偏好设置入口重新打开。</p>
        </div>
      )}
      <details class="review-state">
        <summary>原型状态与评审边界（产品窗口之外）</summary>
        <p>
          ChatGPT 账户及其模型为模拟；公共目录使用项目当前 seed
          的离线归一化数据。搜索目录复用项目共享契约，测试结果与补充文件为模拟；所有动作仅发生于内存，没有真实网络或持久化。模型、来源和维护交互可评审，实际
          schema、运行时与验收由实施交接票承接。原型不会解除真实账户暂停或完成实机验收。
        </p>
        <pre id="prototype-state">{JSON.stringify(totalSnapshot, null, 2)}</pre>
      </details>
    </div>
  );
}

render(<App />, document.getElementById("prototype-root")!);
