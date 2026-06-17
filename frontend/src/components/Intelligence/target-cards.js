/* ─────────────────────────────────────────────────────────────
   target-cards.js
   Renders 4 targeting cards into a container:
     1. Target Geography  — editable combobox + recommended chips
     2. Target Industry   — editable combobox + recommended chips
     3. Employee Size     — multi-select buttons
     4. Job Level         — multi-select buttons

   Usage:
     TargetCards.render(document.getElementById("targeting-cards"), {
       onChange: (selection) => console.log(selection),        // every toggle
       onApply:  (selection) => postToPipeline(selection),     // Save & Apply
     });

   selection shape (all multi-select):
     {
       geographies: ["United States", ...],
       industries:  ["Banking", ...],
       employee_sizes: ["100-249", ...],
       job_levels:     ["Director", ...],
     }

   Geography list  = Location_desc  (Mst_tbllocationelements, Isactive=1)
   Industry list   = Standard_industry_desc (Mst_tblstandardindustry, Isactive=1)
   ───────────────────────────────────────────────────────────── */

(function (global) {
  "use strict";

  // ── DATA ────────────────────────────────────────────────────
  const GEOGRAPHIES = [
    "Afghanistan", "Albania", "Algeria", "American Samoa", "Andorra", "Angola",
    "Anguilla", "Antarctica", "Antigua and Barbuda", "Argentina", "Armenia",
    "Aruba", "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh",
    "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bermuda", "Bhutan",
    "Bolivia, Plurinational State of", "Bosnia and Herzegovina", "Botswana",
    "Bouvet Island", "Brazil", "British Indian Ocean Territory", "Brunei Darussalam",
    "Bulgaria", "Burkina Faso", "Burundi", "Cambodia", "Cameroon", "Canada",
    "Cape Verde", "Cayman Islands", "Central African Republic", "Chad", "Chile",
    "China", "Christmas Island", "Cocos (Keeling) Islands", "Colombia", "Comoros",
    "Congo", "Congo, the Democratic Republic of the", "Cook Islands", "Costa Rica",
    "Côte d'Ivoire", "Croatia", "Cuba", "Cyprus", "Czech Republic", "Denmark",
    "Djibouti", "Dominica", "Dominican Republic", "Timor-Leste(East Timor)",
    "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia",
    "Ethiopia", "External Territories of Australia", "Falkland Islands (Malvinas)",
    "Faroe Islands", "Fiji", "Finland", "France", "French Guiana", "French Polynesia",
    "French Southern Territories", "Gabon", "Gambia", "Georgia", "Germany",
    "Ghana", "Gibraltar", "Greece", "Greenland", "Grenada", "Guadeloupe", "Guam",
    "Guatemala", "Guernsey (and Alderney)", "Guinea", "Guinea-Bissau", "Guyana",
    "Haiti", "Heard Island and McDonald Islands", "Honduras", "Hong Kong",
    "Hungary", "Iceland", "India", "Indonesia", "Iran, Islamic Republic of",
    "Iraq", "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jersey", "Jordan",
    "Kazakhstan", "Kenya", "Kiribati", "Korea, Democratic People's Republic of",
    "Korea, Republic of", "Kuwait", "Kyrgyzstan", "Lao People's Democratic Republic",
    "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania",
    "Luxembourg", "Macao", "Macedonia, the Former Yugoslav Republic of", "Madagascar",
    "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Isle of Man", "Marshall Islands",
    "Martinique", "Mauritania", "Mauritius", "Mayotte", "Mexico", "Micronesia, Federated States of",
    "Moldova, Republic of", "Monaco", "Mongolia", "Montserrat", "Morocco",
    "Mozambique", "Myanmar", "Namibia", "Nauru", "Nepal", "Netherlands Antilles",
    "Netherlands", "New Caledonia", "New Zealand", "Nicaragua", "Niger", "Nigeria",
    "Niue", "Norfolk Island", "Northern Mariana Islands", "Norway", "Oman",
    "Pakistan", "Palau", "Palestine, State of", "Panama", "Papua New Guinea",
    "Paraguay", "Peru", "Philippines", "Pitcairn", "Poland", "Portugal", "Puerto Rico",
    "Qatar", "Réunion", "Romania", "Russian Federation", "Rwanda", "Saint Helena, Ascension and Tristan da Cunha",
    "Saint Kitts and Nevis", "Saint Lucia", "Saint Pierre and Miquelon", "Saint Vincent and the Grenadines",
    "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal",
    "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia",
    "Smaller Territories of the UK", "Solomon Islands", "Somalia", "South Africa",
    "South Georgia and the South Sandwich Islands", "South Sudan", "Spain",
    "Sri Lanka", "Sudan", "Suriname", "Svalbard and Jan Mayen", "Swaziland",
    "Sweden", "Switzerland", "Syrian Arab Republic", "Taiwan, Province of China",
    "Tajikistan", "Tanzania, United Republic of", "Thailand", "Togo", "Tokelau",
    "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Turks and Caicos Islands",
    "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom",
    "United States", "United States Minor Outlying Islands", "Uruguay", "Uzbekistan",
    "Vanuatu", "Holy See (Vatican City State)", "Venezuela, Bolivarian Republic of",
    "Viet Nam", "Virgin Islands, British", "Virgin Islands, U.S.", "Wallis and Futuna",
    "Western Sahara", "Yemen", "Montenegro(Yugoslavia)", "Zambia", "Zimbabwe",
    "Åland Islands",
  ];

  const INDUSTRIES = [
    "Agriculture & Mining", "Airlines & Aviation", "Banking", "Biotechnology",
    "Business Services", "Chemicals", "Computers & Electronics", "Consulting",
    "Consumer Services", "Defense & Space", "Education - Higher Education",
    "Education - Primary & Secondary", "Energy & Utilities", "Financial", "Food & Beverages",
    "Government - Federal / National", "Government - Local", "Government - State / Provincial",
    "Healthcare", "High Tech", "Insurance", "Life Sciences", "Manufacturing",
    "Marketing & Advertising", "Media & Entertainment", "Nonprofit", "Real Estate & Construction",
    "Retail", "Software & Internet", "Telecommunications", "Transportation & Storage",
    "Travel, Recreation & Leisure", "Wholesale & Distribution", "Education",
    "Accounting", "Financial Services", "Other",
  ];

  const EMPLOYEE_SIZES = [
    "1-9", "10-19", "20-49", "50-99", "100-249", "250-499",
    "500-999", "1000-2499", "2500-4999", "5000-9999", "10000+",
  ];

  const JOB_LEVELS = [
    "Analyst", "Architect", "Administrator", "Engineer", "Security",
    "Staff", "Manager", "Director", "VP", "C-Level", "Owner",
    "President", "Head", "Other", "Founder",
  ];

  // Recommended quick-pick chips (high-frequency targets)
  const RECOMMENDED_GEOS = [
    "United States", "United Kingdom", "India", "Canada",
    "Australia", "Germany", "Singapore",
  ];

  const RECOMMENDED_INDUSTRIES = [
    "Software & Internet", "Banking", "Healthcare",
    "Manufacturing", "High Tech", "Financial Services",
  ];

  // ── STATE ───────────────────────────────────────────────────
  const state = {
    geographies: [],
    industries: [],
    employee_sizes: [],
    job_levels: [],
  };

  let onChangeCb = null;

  function emit() {
    if (typeof onChangeCb === "function") {
      onChangeCb(JSON.parse(JSON.stringify(state)));
    }
  }

  // ── FUZZY-ISH MATCH ─────────────────────────────────────────
  // "somewhat matches": prefix > substring > subsequence
  function matchScore(option, query) {
    const opt = option.toLowerCase();
    const q = query.toLowerCase().trim();
    if (!q) return 1;
    if (opt.startsWith(q)) return 3;
    if (opt.includes(q)) return 2;
    let i = 0;
    for (const ch of opt) {
      if (ch === q[i]) i++;
      if (i === q.length) return 1;
    }
    return 0;
  }

  function filterOptions(options, query, limit = 50) {
    if (!query.trim()) return options.slice(0, limit);
    return options
      .map((o) => ({ o, s: matchScore(o, query) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s || a.o.localeCompare(b.o))
      .slice(0, limit)
      .map((x) => x.o);
  }

  function highlight(option, query) {
    const q = query.trim();
    if (!q) return escapeHtml(option);
    const idx = option.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return escapeHtml(option);
    return (
      escapeHtml(option.slice(0, idx)) +
      "<mark>" + escapeHtml(option.slice(idx, idx + q.length)) + "</mark>" +
      escapeHtml(option.slice(idx + q.length))
    );
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[c]);
  }

  // ── PRE-SELECTION HELPERS ───────────────────────────────────
  // Map an incoming value (e.g. from the current ICP) onto the canonical
  // casing used by an options list, falling back to the raw value if no
  // match exists (the value is still pre-selected, just without a chip).
  function findCanonical(value, options) {
    const lower = String(value).toLowerCase().trim();
    return options.find((o) => o.toLowerCase() === lower) || value;
  }

  // Looser match for button-grid cards: ignores spacing/punctuation so
  // DB values like "C-Level" match an option like "C Level".
  function normalizeKey(s) {
    return String(s).toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  function findCanonicalNormalized(value, options) {
    const key = normalizeKey(value);
    return options.find((o) => normalizeKey(o) === key) || value;
  }

  // ── DOM HELPERS ─────────────────────────────────────────────
  function el(tag, cls, html) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (html !== undefined) node.innerHTML = html;
    return node;
  }

  // ── COMBOBOX CARD (geography / industry) ────────────────────
  function buildComboCard({ step, title, sub, placeholder, options, recommended, stateKey, initial }) {
    const card = el("div", "tc-card");
    card.appendChild(el("div", "tc-card-title",
      '<span class="tc-step">' + step + "</span>" + escapeHtml(title)));
    card.appendChild(el("div", "tc-card-sub", escapeHtml(sub)));

    // combobox
    const combo = el("div", "tc-combo");
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = placeholder;
    input.setAttribute("role", "combobox");
    input.setAttribute("aria-expanded", "false");
    input.autocomplete = "off";
    const caret = el("span", "tc-caret", "&#9662;");
    const list = el("div", "tc-combo-list");
    list.setAttribute("role", "listbox");
    combo.append(input, caret, list);
    card.appendChild(combo);

    // chips
    const chipRow = el("div", "tc-chip-row");
    chipRow.appendChild(el("span", "tc-chip-label", "Recommended"));
    const chips = recommended.map((r) => {
      const b = el("button", "tc-chip", escapeHtml(r));
      b.type = "button";
      b.addEventListener("click", () => select(r));
      chipRow.appendChild(b);
      return b;
    });
    card.appendChild(chipRow);

    const footer = el("div", "tc-selection", "No selection");
    card.appendChild(footer);

    const arr = state[stateKey];
    const chipEls = new Map();
    chips.forEach((c) => chipEls.set(c.textContent, c));

    let activeIdx = -1;
    let visible = [];

    function renderList(query) {
      visible = filterOptions(options, query);
      activeIdx = -1;
      if (!visible.length) {
        list.innerHTML = '<div class="tc-combo-empty">No matches for "' +
          escapeHtml(query) + '"</div>';
      } else {
        list.innerHTML = "";
        visible.forEach((opt) => {
          const item = el("div", "tc-combo-item", highlight(opt, query));
          item.setAttribute("role", "option");
          item.addEventListener("mousedown", (e) => {
            e.preventDefault(); // keep input focus
            select(opt);
          });
          list.appendChild(item);
        });
      }
      open();
    }

    function open() {
      list.classList.add("open");
      input.setAttribute("aria-expanded", "true");
    }
    function close() {
      list.classList.remove("open");
      input.setAttribute("aria-expanded", "false");
      activeIdx = -1;
    }

    function syncFooter() {
      footer.innerHTML = arr.length
        ? "Selected: <strong>" + arr.map(escapeHtml).join(", ") + "</strong>"
        : "No selection";
    }

    // Toggle a value in/out of the multi-selection.
    // Values picked from the dropdown that are not in the recommended
    // row get their own chip so they stay visible and removable.
    function select(value) {
      const i = arr.indexOf(value);
      if (i === -1) {
        arr.push(value);
        if (!chipEls.has(value)) {
          const b = el("button", "tc-chip", escapeHtml(value));
          b.type = "button";
          b.addEventListener("click", () => select(value));
          chipRow.appendChild(b);
          chipEls.set(value, b);
        }
        chipEls.get(value).classList.add("selected");
      } else {
        arr.splice(i, 1);
        if (chipEls.has(value)) chipEls.get(value).classList.remove("selected");
      }
      // input is only a picker — clear it after each selection
      input.value = "";
      syncFooter();
      close();
      emit();
    }

    // Pre-select values carried over from the current ICP (e.g. the
    // existing target geography/industry), mapped onto this card's options.
    (initial || []).forEach((val) => {
      if (val == null || val === "") return;
      select(findCanonical(val, options));
    });

    input.addEventListener("input", () => {
      renderList(input.value);
    });

    input.addEventListener("focus", () => renderList(input.value));

    input.addEventListener("keydown", (e) => {
      const items = list.querySelectorAll(".tc-combo-item");
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        if (!items.length) return;
        activeIdx = e.key === "ArrowDown"
          ? Math.min(activeIdx + 1, items.length - 1)
          : Math.max(activeIdx - 1, 0);
        items.forEach((it, i) => it.classList.toggle("active", i === activeIdx));
        items[activeIdx].scrollIntoView({ block: "nearest" });
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (activeIdx >= 0 && visible[activeIdx]) {
          select(visible[activeIdx]);
        } else if (visible.length === 1) {
          select(visible[0]);
        }
      } else if (e.key === "Escape") {
        close();
      }
    });

    input.addEventListener("blur", () => setTimeout(close, 120));

    return card;
  }

  // ── BUTTON-GRID CARD (employee size / job level) ────────────
  function buildButtonCard({ step, title, sub, options, stateKey, initial }) {
    const card = el("div", "tc-card");
    card.appendChild(el("div", "tc-card-title",
      '<span class="tc-step">' + step + "</span>" + escapeHtml(title)));
    card.appendChild(el("div", "tc-card-sub", escapeHtml(sub)));

    const grid = el("div", "tc-btn-grid");
    const footer = el("div", "tc-selection", "No selection");
    const arr = state[stateKey];
    const buttonEls = new Map();

    function syncFooter() {
      footer.innerHTML = arr.length
        ? "Selected: <strong>" + arr.map(escapeHtml).join(", ") + "</strong>"
        : "No selection";
    }

    function toggle(opt) {
      const i = arr.indexOf(opt);
      if (i === -1) arr.push(opt);
      else arr.splice(i, 1);
      const b = buttonEls.get(opt);
      if (b) b.classList.toggle("selected", i === -1);
      syncFooter();
    }

    options.forEach((opt) => {
      const b = el("button", "tc-opt", escapeHtml(opt));
      b.type = "button";
      b.addEventListener("click", () => { toggle(opt); emit(); });
      buttonEls.set(opt, b);
      grid.appendChild(b);
    });

    card.appendChild(grid);
    card.appendChild(footer);

    // Pre-select values carried over from the current ICP. If a value
    // doesn't map onto any button (e.g. a custom DB job-level string),
    // it's still added to the selection — it just won't have a chip.
    (initial || []).forEach((val) => {
      if (val == null || val === "") return;
      const canon = findCanonicalNormalized(val, options);
      if (arr.indexOf(canon) === -1) toggle(canon);
    });
    syncFooter();

    return card;
  }

  // ── CARD FACTORY ────────────────────────────────────────────
  function buildAllCards(initial = {}) {
    return [
      buildComboCard({
        step: "1",
        title: "Target Geography",
        sub: "Type to search a country, or pick a recommended market.",
        placeholder: "Search countries\u2026",
        options: GEOGRAPHIES,
        recommended: RECOMMENDED_GEOS.filter((g) => GEOGRAPHIES.includes(g)),
        stateKey: "geographies",
        initial: initial.geographies,
      }),
      buildComboCard({
        step: "2",
        title: "Target Industry",
        sub: "Type to search an industry, or pick a recommended sector.",
        placeholder: "Search industries\u2026",
        options: INDUSTRIES,
        recommended: RECOMMENDED_INDUSTRIES.filter((i) => INDUSTRIES.includes(i)),
        stateKey: "industries",
        initial: initial.industries,
      }),
      buildButtonCard({
        step: "3",
        title: "Employee Size",
        sub: "Select one or more company-size ranges.",
        options: EMPLOYEE_SIZES,
        stateKey: "employee_sizes",
        initial: initial.employee_sizes,
      }),
      buildButtonCard({
        step: "4",
        title: "Job Title",
        sub: "Select one or more target seniority levels.",
        options: JOB_LEVELS,
        stateKey: "job_levels",
        initial: initial.job_levels,
      }),
    ];
  }

  // ── PUBLIC API ──────────────────────────────────────────────
  const CARDS_PER_PAGE = 2;

  const TargetCards = {
    /**
     * Paginated render: 2 cards per page with back / next arrows.
     */
    render(container, opts = {}) {
      onChangeCb = opts.onChange || null;
      container.innerHTML = "";

      // Reset selection state, then seed it from any pre-existing
      // (current ICP) criteria passed via opts.initial.
      state.geographies = [];
      state.industries = [];
      state.employee_sizes = [];
      state.job_levels = [];

      const cards = buildAllCards(opts.initial || {});
      const pageCount = Math.ceil(cards.length / CARDS_PER_PAGE);

      const pager = el("div", "tc-pager");

      // pages
      const pages = [];
      for (let p = 0; p < pageCount; p++) {
        const page = el("div", "tc-page");
        const wrap = el("div", "tc-wrap");
        cards
          .slice(p * CARDS_PER_PAGE, (p + 1) * CARDS_PER_PAGE)
          .forEach((c) => wrap.appendChild(c));
        page.appendChild(wrap);
        pager.appendChild(page);
        pages.push(page);
      }

      // nav: back arrow | dots | next arrow
      const nav = el("div", "tc-pager-nav");
      const backBtn = el("button", "tc-arrow", "&#8592;");
      backBtn.type = "button";
      backBtn.setAttribute("aria-label", "Previous cards");
      const nextBtn = el("button", "tc-arrow", "&#8594;");
      nextBtn.type = "button";
      nextBtn.setAttribute("aria-label", "Next cards");
      const dots = el("div", "tc-dots");
      const dotEls = pages.map((_, i) => {
        const d = el("span", "tc-dot");
        dots.appendChild(d);
        return d;
      });
      nav.append(backBtn, dots, nextBtn);
      pager.appendChild(nav);

      let current = 0;
      function show(p) {
        current = p;
        pages.forEach((pg, i) => pg.classList.toggle("active", i === p));
        dotEls.forEach((d, i) => d.classList.toggle("active", i === p));
        backBtn.disabled = p === 0;
        nextBtn.disabled = p === pageCount - 1;
      }

      backBtn.addEventListener("click", () => current > 0 && show(current - 1));
      nextBtn.addEventListener("click", () => current < pageCount - 1 && show(current + 1));

      // Save and proceed — visible only on the last page
      const onApply = opts.onApply || null;
      const applyRow = el("div", "tc-apply-row");
      const applyBtn = el("button", "tc-btn-apply", "Save and proceed");
      applyBtn.type = "button";
      applyBtn.addEventListener("click", () => {
        if (onApply) onApply(TargetCards.getSelection());
      });
      applyRow.appendChild(applyBtn);
      pager.appendChild(applyRow);

      const baseShow = show;
      show = function (p) {
        baseShow(p);
        applyRow.style.display = p === pageCount - 1 ? "flex" : "none";
      };

      show(0);
      container.appendChild(pager);
      return TargetCards;
    },

    getSelection() {
      return JSON.parse(JSON.stringify(state));
    },

    reset() {
      state.geographies = [];
      state.industries = [];
      state.employee_sizes = [];
      state.job_levels = [];
      emit();
    },
  };

  global.TargetCards = TargetCards;
})(window);
