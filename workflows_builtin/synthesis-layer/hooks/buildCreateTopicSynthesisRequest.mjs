function isRecord(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isStringArray(value) {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function hasNonEmptyString(value) {
  return typeof value === "string" && !!value.trim();
}

function hasSelectorValue(value) {
  return Array.isArray(value) && value.some(hasNonEmptyString);
}

function hasResolverSelector(resolver) {
  return (
    hasSelectorValue(resolver.paper_refs) ||
    hasSelectorValue(resolver.collection_key) ||
    (isRecord(resolver.tag) &&
      ["and", "or", "not"].some((key) => hasSelectorValue(resolver.tag[key])))
  );
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function resolveWorkflowParams(manifest, executionOptions) {
  const defaults = Object.fromEntries(
    Object.entries(manifest?.parameters || {}).flatMap(([key, schema]) =>
      Object.prototype.hasOwnProperty.call(schema || {}, "default")
        ? [[key, schema.default]]
        : [],
    ),
  );
  const supplied = isRecord(executionOptions?.workflowParams)
    ? executionOptions.workflowParams
    : {};
  return { ...defaults, ...supplied };
}

function invalidPlannedTopic(topicId) {
  return new Error(
    `Planned Topic is missing, stale, or incomplete: ${topicId}`,
  );
}

function readPlannedTopic(result, topicId) {
  const semantic = result?.semantic;
  const definition = semantic?.topic_definition;
  const resolver = semantic?.topic_resolver;
  const planning = semantic?.planning;
  if (
    result?.status === "not_found" ||
    result?.status === "invalid" ||
    !isRecord(semantic) ||
    semantic.topic_id !== topicId ||
    semantic.lifecycle !== "planned" ||
    !isRecord(definition) ||
    definition.id !== topicId ||
    typeof definition.title !== "string" ||
    !definition.title.trim() ||
    typeof definition.definition !== "string" ||
    !definition.definition.trim() ||
    !isStringArray(definition.aliases) ||
    !isStringArray(definition.scope_include) ||
    !isStringArray(definition.scope_exclude) ||
    !isRecord(resolver) ||
    !hasResolverSelector(resolver) ||
    (typeof resolver.combine !== "undefined" &&
      resolver.combine !== "union" &&
      resolver.combine !== "intersection") ||
    !isRecord(planning) ||
    planning.lifecycle !== "planned" ||
    !Number.isSafeInteger(planning.revision) ||
    planning.revision <= 0
  ) {
    throw invalidPlannedTopic(topicId);
  }
  return {
    topic_id: topicId,
    lifecycle: "planned",
    topic_definition: {
      id: definition.id,
      title: definition.title,
      definition: definition.definition,
      aliases: [...definition.aliases],
      scope_include: [...definition.scope_include],
      scope_exclude: [...definition.scope_exclude],
    },
    topic_resolver: cloneJson(resolver),
    planning: cloneJson(planning),
  };
}

function buildTaskName(manifest, title) {
  const template = String(manifest?.taskNameTemplate || "{topic seed}");
  return template.includes("{topic seed}")
    ? template.replace("{topic seed}", () => title)
    : title;
}

export async function buildRequest({
  manifest,
  executionOptions,
  runtime,
}) {
  const params = resolveWorkflowParams(manifest, executionOptions);
  const usePlannedTopic = params.usePlannedTopic === true;
  const plannedTopicId = String(params.plannedTopicId || "").trim();
  const topicSeed = String(params.topicSeed || "").trim();
  if (usePlannedTopic && !plannedTopicId)
    throw invalidPlannedTopic(plannedTopicId || "(missing topic id)");
  if (!usePlannedTopic && !topicSeed)
    throw new Error("Create topic synthesis requires a topic seed");

  let snapshot;
  let title = topicSeed;
  if (usePlannedTopic) {
    const result = await runtime.hostApi.synthesis.topics.getContext({
      topicId: plannedTopicId,
      view: "semantic",
    });
    snapshot = readPlannedTopic(result, plannedTopicId);
    title = snapshot.topic_definition.title;
  }

  const request = manifest?.request;
  const steps = Array.isArray(request?.sequence?.steps)
    ? request.sequence.steps.map((step) => ({
        ...step,
        ...(usePlannedTopic && step.id === "prepare"
          ? {
              input: {
                ...(isRecord(step.input) ? step.input : {}),
                planned_topic: snapshot,
              },
            }
          : {}),
      }))
    : [];
  const finalStepId = String(manifest?.result?.final_step_id || "").trim();
  if (steps.length === 0 || !finalStepId) {
    throw new Error(
      "Create topic synthesis requires a manifest sequence and final step",
    );
  }

  return {
    kind: "skillrunner.sequence.v1",
    taskName: buildTaskName(manifest, title),
    steps,
    final_step_id: finalStepId,
    parameter: usePlannedTopic
      ? {
          usePlannedTopic: true,
          plannedTopicId,
          language: params.language,
        }
      : {
          usePlannedTopic: false,
          topicSeed,
          language: params.language,
        },
    poll: {
      interval_ms:
        request?.poll?.interval_ms || manifest?.execution?.poll_interval_ms,
    },
  };
}
