(function () {
  "use strict";

  function finiteBound(value) {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
  }

  function formatLabel(entry) {
    const title = String((entry && entry.title) || "");
    const minimum = finiteBound(entry && entry.min);
    const maximum = finiteBound(entry && entry.max);
    return minimum !== null && maximum !== null
      ? title + " (" + minimum + "–" + maximum + ")"
      : title;
  }

  function validate(args) {
    const entry = (args && args.entry) || {};
    const raw = String(
      args && args.rawValue != null ? args.rawValue : "",
    ).trim();
    if (!raw) {
      return { valid: true, remove: true, code: "" };
    }
    const value = Number(raw);
    if (!Number.isFinite(value)) {
      return {
        valid: false,
        code: "not_number",
        message: "Enter a valid number.",
      };
    }
    if (entry.integer === true && !Number.isInteger(value)) {
      return {
        valid: false,
        code: "not_integer",
        message: "Enter a whole number.",
      };
    }
    const minimum = finiteBound(entry.min);
    if (minimum !== null && value < minimum) {
      return {
        valid: false,
        code: "below_minimum",
        bound: minimum,
        message: "Enter a value of at least " + minimum + ".",
      };
    }
    const maximum = finiteBound(entry.max);
    if (maximum !== null && value > maximum) {
      return {
        valid: false,
        code: "above_maximum",
        bound: maximum,
        message: "Enter a value no greater than " + maximum + ".",
      };
    }
    return { valid: true, value: value, code: "" };
  }

  window.zoteroAgentsWorkflowNumberFields = Object.freeze({
    formatLabel: formatLabel,
    validate: validate,
  });
})();
