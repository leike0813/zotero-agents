(function () {
  function toText(value) {
    return String(value == null ? "" : value);
  }

  window.createCustomSelect = function (options, currentValue, onChange) {
    const wrap = document.createElement("div");
    wrap.className = "custom-select";

    const trigger = document.createElement("div");
    trigger.className = "custom-select-trigger";
    trigger.tabIndex = 0;
    
    const currentOption = options.find(function(opt) { return toText(opt.value) === toText(currentValue); }) || options[0] || { value: "", label: "" };
    const triggerLabel = document.createElement("span");
    triggerLabel.className = "custom-select-trigger-label";
    trigger.appendChild(triggerLabel);
    triggerLabel.textContent = currentOption.label;
    trigger.title = currentOption.label;

    const menu = document.createElement("div");
    menu.className = "custom-select-menu";

    let isOpen = false;

    function closeMenu() {
      isOpen = false;
      menu.classList.remove("open");
    }

    function toggleMenu() {
      isOpen = !isOpen;
      if (isOpen) {
        // Close all other custom selects
        const allMenus = document.querySelectorAll(".custom-select-menu");
        allMenus.forEach(function(m) { m.classList.remove("open"); });
        menu.classList.add("open");
        
        // Ensure menu is fully visible in viewport
        const rect = trigger.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        // Basic check if there's enough space below (assuming 200px max height)
        if (rect.bottom + 200 > viewportHeight && rect.top > 200) {
          menu.style.top = "auto";
          menu.style.bottom = "100%";
          menu.style.marginTop = "0";
          menu.style.marginBottom = "4px";
          menu.classList.add("open-up");
        } else {
          menu.style.top = "100%";
          menu.style.bottom = "auto";
          menu.style.marginTop = "4px";
          menu.style.marginBottom = "0";
          menu.classList.remove("open-up");
        }
      } else {
        closeMenu();
      }
    }

    trigger.addEventListener("click", function (event) {
      event.stopPropagation();
      toggleMenu();
    });

    trigger.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggleMenu();
      } else if (event.key === "Escape") {
        closeMenu();
      }
    });

    options.forEach(function (opt) {
      const optionEl = document.createElement("div");
      optionEl.className = "custom-select-option";
      if (toText(opt.value) === toText(currentValue)) {
        optionEl.classList.add("selected");
      }
      optionEl.textContent = opt.label;
      optionEl.title = opt.description
        ? opt.label + "\n" + opt.description
        : opt.label; // For tooltip if truncated
      optionEl.addEventListener("click", function (event) {
        event.stopPropagation();
        triggerLabel.textContent = opt.label;
        trigger.title = opt.label;
        const previousSelected = menu.querySelector(".selected");
        if (previousSelected) previousSelected.classList.remove("selected");
        optionEl.classList.add("selected");
        closeMenu();
        if (toText(opt.value) !== toText(currentValue)) {
          onChange(opt.value);
        }
      });
      menu.appendChild(optionEl);
    });

    wrap.appendChild(trigger);
    wrap.appendChild(menu);

    wrap.closeMenu = function() {
      closeMenu();
    };

    return {
      element: wrap,
      setValue: function(val) {
        const opt = options.find(function(o) { return toText(o.value) === toText(val); });
        if (opt) {
          triggerLabel.textContent = opt.label;
          trigger.title = opt.label;
          const opts = menu.querySelectorAll(".custom-select-option");
          opts.forEach(function(el) { el.classList.remove("selected"); });
          const matchedOpt = Array.from(opts).find(function(el) { return el.textContent === opt.label; });
          if (matchedOpt) matchedOpt.classList.add("selected");
        }
      }
    };
  };

  // Click outside to close any open dropdowns
  document.addEventListener("click", function (event) {
    if (!event.target.closest(".custom-select")) {
      document.querySelectorAll(".custom-select").forEach(function(wrap) {
        if (typeof wrap.closeMenuAndApply === "function") {
          wrap.closeMenuAndApply();
        } else if (typeof wrap.closeMenu === "function") {
          wrap.closeMenu();
        }
      });
    }
  });

  window.createMultiSelect = function (options, currentValues, onChange, placeholder) {
    const wrap = document.createElement("div");
    wrap.className = "custom-select custom-multi-select";

    const trigger = document.createElement("div");
    trigger.className = "custom-select-trigger";
    trigger.tabIndex = 0;
    
    const toText = function(v) { return v === null || v === undefined ? "" : String(v); };
    
    function updateTriggerText() {
      if (currentValues.length === 0) {
        trigger.textContent = placeholder || "None";
      } else if (currentValues.length === options.length && options.length > 0) {
        trigger.textContent = placeholder || "All";
      } else if (currentValues.length === 1) {
        const opt = options.find(function(o) { return toText(o.value) === toText(currentValues[0]); });
        trigger.textContent = opt ? opt.label : currentValues[0];
      } else {
        trigger.textContent = currentValues.length + " selected";
      }
    }
    updateTriggerText();

    const menu = document.createElement("div");
    menu.className = "custom-select-menu";

    let isOpen = false;

    function closeMenu() {
      isOpen = false;
      menu.classList.remove("open");
    }

    wrap.closeMenuAndApply = function() {
      if (isOpen) {
        closeMenu();
        onChange(currentValues);
      }
    };

    function toggleMenu() {
      isOpen = !isOpen;
      if (isOpen) {
        // close others
        document.querySelectorAll(".custom-select").forEach(function(otherWrap) {
          if (otherWrap !== wrap) {
             if (typeof otherWrap.closeMenuAndApply === "function") otherWrap.closeMenuAndApply();
             else if (typeof otherWrap.closeMenu === "function") otherWrap.closeMenu();
          }
        });
        
        menu.classList.add("open");
        
        const rect = trigger.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        if (rect.bottom + 200 > viewportHeight && rect.top > 200) {
          menu.style.top = "auto";
          menu.style.bottom = "100%";
          menu.style.marginTop = "0";
          menu.style.marginBottom = "4px";
          menu.classList.add("open-up");
        } else {
          menu.style.top = "100%";
          menu.style.bottom = "auto";
          menu.style.marginTop = "4px";
          menu.style.marginBottom = "0";
          menu.classList.remove("open-up");
        }
      } else {
        wrap.closeMenuAndApply();
      }
    }

    trigger.addEventListener("click", function (event) {
      event.stopPropagation();
      toggleMenu();
    });

    trigger.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggleMenu();
      } else if (event.key === "Escape") {
        wrap.closeMenuAndApply();
      }
    });

    // Prevent closing when clicking inside the menu
    menu.addEventListener("click", function(event) {
       event.stopPropagation();
    });

    options.forEach(function (opt) {
      const optionEl = document.createElement("label");
      optionEl.className = "custom-select-option custom-multi-select-option";
      optionEl.title = opt.label;
      
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = currentValues.includes(toText(opt.value));
      
      checkbox.addEventListener("change", function(e) {
        e.stopPropagation();
        if (checkbox.checked) {
          if (!currentValues.includes(toText(opt.value))) {
            currentValues.push(toText(opt.value));
          }
        } else {
          currentValues = currentValues.filter(function(v) { return v !== toText(opt.value); });
        }
        updateTriggerText();
      });

      optionEl.appendChild(checkbox);
      optionEl.appendChild(document.createTextNode(" " + opt.label));
      
      menu.appendChild(optionEl);
    });

    wrap.appendChild(trigger);
    wrap.appendChild(menu);

    return {
      element: wrap,
      setValue: function(vals) {
        currentValues = vals || [];
        updateTriggerText();
        const opts = menu.querySelectorAll("input[type='checkbox']");
        opts.forEach(function(cb, index) {
          if (options[index]) {
             cb.checked = currentValues.includes(toText(options[index].value));
          }
        });
      }
    };
  };

})();
