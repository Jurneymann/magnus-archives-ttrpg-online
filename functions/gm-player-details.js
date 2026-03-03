/**
 * GM Player Details Formatting Functions
 * Formats character data for display in collapsible sections
 */

/**
 * Generate a collapsible section with toggle functionality
 */
function generateCollapsibleSection(playerId, sectionId, title, content) {
  if (!content || content.trim() === "") {
    return "";
  }

  const uniqueId = `${playerId}-${sectionId}`;

  return `
    <div style="margin-bottom: 8px; border: 1px solid rgba(100, 100, 100, 0.3); border-radius: 4px; overflow: hidden;">
      <button 
        onclick="togglePlayerDetailSection('${uniqueId}')" 
        style="width: 100%; background: rgba(60, 60, 60, 0.5); border: none; padding: 10px; text-align: left; cursor: pointer; color: #d4a574; font-weight: bold; font-size: 0.9em; display: flex; justify-content: space-between; align-items: center;"
        onmouseover="this.style.background='rgba(80, 80, 80, 0.6)'" 
        onmouseout="this.style.background='rgba(60, 60, 60, 0.5)'">
        <span>${title}</span>
        <span id="${uniqueId}-arrow" style="transition: transform 0.2s;">▼</span>
      </button>
      <div id="${uniqueId}-content" style="display: none; padding: 12px; background: rgba(30, 30, 30, 0.4); font-size: 0.85em;">
        ${content}
      </div>
    </div>
  `;
}

/**
 * Toggle collapsible section visibility
 */
function togglePlayerDetailSection(sectionId) {
  const content = document.getElementById(`${sectionId}-content`);
  const arrow = document.getElementById(`${sectionId}-arrow`);

  if (content.style.display === "none") {
    content.style.display = "block";
    arrow.style.transform = "rotate(180deg)";
  } else {
    content.style.display = "none";
    arrow.style.transform = "rotate(0deg)";
  }
}

/**
 * Format Character Arc information
 */
function formatCharacterArc(characterArc) {
  if (
    !characterArc ||
    !characterArc.activeArcs ||
    characterArc.activeArcs.length === 0
  ) {
    return '<div style="color: #999; font-style: italic;">No active character arc</div>';
  }

  return (
    characterArc.activeArcs
      .map(
        (arc) => `
    <div style="margin-bottom: 10px; padding: 8px; background: rgba(212, 165, 116, 0.1); border-left: 3px solid #d4a574; border-radius: 2px;">
      <div style="font-weight: bold; color: #d4a574; margin-bottom: 4px;">${arc.arcName}</div>
      ${arc.arcNotes ? `<div style="color: #ccc; font-size: 0.9em;">${arc.arcNotes}</div>` : ""}
    </div>
  `,
      )
      .join("") +
    `
    <div style="margin-top: 8px; color: #aaa; font-size: 0.85em;">
      Arcs Completed: ${characterArc.arcsCompleted || 0}
    </div>
  `
  );
}

/**
 * Format Skills (combines skillsData and descriptorSkills)
 */
function formatSkills(skillsData, descriptorSkills) {
  const allSkills = [];

  // Combine all skills
  if (skillsData && Array.isArray(skillsData)) {
    allSkills.push(...skillsData);
  }

  if (descriptorSkills && Array.isArray(descriptorSkills)) {
    // Add descriptor skills that aren't already in skillsData
    descriptorSkills.forEach((ds) => {
      if (!allSkills.find((s) => s.skill === ds.skill)) {
        allSkills.push(ds);
      }
    });
  }

  if (allSkills.length === 0) {
    return '<div style="color: #999; font-style: italic;">No skills</div>';
  }

  // Group by ability level
  const trained = allSkills.filter((s) => s.ability === "Trained");
  const specialized = allSkills.filter((s) => s.ability === "Specialized");
  const inabilities = allSkills.filter((s) => s.ability === "Inability");

  let html = "";

  if (specialized.length > 0) {
    html +=
      '<div style="margin-bottom: 8px;"><strong style="color: #4caf50;">Specialized:</strong> ' +
      specialized.map((s) => `${s.skill} (${s.stat})`).join(", ") +
      "</div>";
  }

  if (trained.length > 0) {
    html +=
      '<div style="margin-bottom: 8px;"><strong style="color: #42a5f5;">Trained:</strong> ' +
      trained.map((s) => `${s.skill} (${s.stat})`).join(", ") +
      "</div>";
  }

  if (inabilities.length > 0) {
    html +=
      '<div style="margin-bottom: 8px;"><strong style="color: #f44336;">Inabilities:</strong> ' +
      inabilities.map((s) => `${s.skill} (${s.stat})`).join(", ") +
      "</div>";
  }

  return (
    html || '<div style="color: #999; font-style: italic;">No skills</div>'
  );
}

/**
 * Format Descriptor Characteristics
 */
function formatCharacteristics(characteristics) {
  if (
    !characteristics ||
    !Array.isArray(characteristics) ||
    characteristics.length === 0
  ) {
    return '<div style="color: #999; font-style: italic;">No special characteristics</div>';
  }

  return characteristics
    .map(
      (char) => `
    <div style="margin-bottom: 10px; padding: 8px; background: rgba(100, 150, 200, 0.1); border-left: 3px solid #64a0d8; border-radius: 2px;">
      <div style="font-weight: bold; color: #64a0d8; margin-bottom: 4px;">${char.name}</div>
      <div style="color: #ccc; font-size: 0.9em;">${char.description}</div>
    </div>
  `,
    )
    .join("");
}

/**
 * Format Abilities (Type and Focus abilities)
 */
function formatAbilities(typeAbilities, focusAbilities) {
  let html = "";

  if (
    typeAbilities &&
    Array.isArray(typeAbilities) &&
    typeAbilities.length > 0
  ) {
    html +=
      '<div style="margin-bottom: 12px;"><strong style="color: #ab47bc;">Type Abilities:</strong><ul style="margin: 4px 0; padding-left: 20px;">';
    typeAbilities.forEach((ability) => {
      html += `<li style="color: #ccc; margin-bottom: 4px;">${ability}</li>`;
    });
    html += "</ul></div>";
  }

  if (
    focusAbilities &&
    Array.isArray(focusAbilities) &&
    focusAbilities.length > 0
  ) {
    html +=
      '<div><strong style="color: #ff9800;">Focus Abilities:</strong><ul style="margin: 4px 0; padding-left: 20px;">';
    focusAbilities.forEach((ability) => {
      html += `<li style="color: #ccc; margin-bottom: 4px;">${ability}</li>`;
    });
    html += "</ul></div>";
  }

  if (!html) {
    return '<div style="color: #999; font-style: italic;">No abilities selected</div>';
  }

  return html;
}

/**
 * Format Weapons
 */
function formatWeapons(weapons) {
  if (!weapons || !Array.isArray(weapons) || weapons.length === 0) {
    return '<div style="color: #999; font-style: italic;">No weapons</div>';
  }

  return weapons
    .map(
      (weapon) => `
    <div style="margin-bottom: 8px; padding: 8px; background: rgba(244, 67, 54, 0.1); border-left: 3px solid #f44336; border-radius: 2px;">
      <div style="display: flex; justify-content: space-between; align-items: baseline;">
        <strong style="color: #ef5350;">${weapon.Item}</strong>
        <span style="color: #aaa; font-size: 0.85em;">${weapon.Damage || "-"}</span>
      </div>
      ${weapon.Notes ? `<div style="color: #ccc; font-size: 0.85em; margin-top: 4px;">${weapon.Notes}</div>` : ""}
    </div>
  `,
    )
    .join("");
}

/**
 * Format Equipment Items
 */
function formatItems(items) {
  if (!items || !Array.isArray(items) || items.length === 0) {
    return '<div style="color: #999; font-style: italic;">No equipment</div>';
  }

  return (
    '<div style="display: grid; gap: 6px;">' +
    items
      .map(
        (item) => `
    <div style="padding: 6px; background: rgba(100, 100, 100, 0.1); border-radius: 2px;">
      <div style="color: #d4a574; font-weight: 500;">${item.Item}</div>
      ${item.Notes ? `<div style="color: #aaa; font-size: 0.85em; margin-top: 2px;">${item.Notes}</div>` : ""}
    </div>
  `,
      )
      .join("") +
    "</div>"
  );
}

/**
 * Format Cyphers
 */
function formatCyphers(cyphers) {
  if (!cyphers || !Array.isArray(cyphers) || cyphers.length === 0) {
    return '<div style="color: #999; font-style: italic;">No cyphers assigned</div>';
  }

  return cyphers
    .map(
      (cypher) => `
    <div style="margin-bottom: 10px; padding: 10px; background: rgba(0, 188, 212, 0.1); border: 1px solid rgba(0, 188, 212, 0.3); border-radius: 4px;">
      <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;">
        <strong style="color: #00bcd4;">${cypher.name}</strong>
        <span style="color: #aaa; font-size: 0.8em;">Level ${cypher.level}</span>
      </div>
      <div style="color: #80deea; font-size: 0.85em; margin-bottom: 4px;">Action: ${cypher.action}</div>
      <div style="color: #ccc; font-size: 0.9em;">${cypher.effect}</div>
    </div>
  `,
    )
    .join("");
}

/**
 * Format Avatar Power
 */
function formatAvatarPower(avatar) {
  if (!avatar || !avatar.tetheredPowerName) {
    return '<div style="color: #999; font-style: italic;">No tethered power</div>';
  }

  return `
    <div style="padding: 12px; background: rgba(139, 0, 0, 0.2); border: 2px solid #8b0000; border-radius: 4px;">
      <div style="font-weight: bold; color: #ff6b6b; font-size: 1.05em; margin-bottom: 8px;">
        ${avatar.tetheredPowerName}
      </div>
      ${avatar.entityName ? `<div style="color: #ffb3b3; font-size: 0.9em; margin-bottom: 8px;">Entity: ${avatar.entityName}</div>` : ""}
      ${avatar.powerChanges !== undefined ? `<div style="color: #ffc7c7; font-size: 0.85em;">Power Changes: ${avatar.powerChanges}</div>` : ""}
    </div>
  `;
}
