// Magnus Archives GM Tool - Party Management

let partyMembers = [];

function addPartyMember() {
  const member = {
    id: Date.now(),
    name: "",
    descriptor: "",
    type: "",
    focus: "",
    tier: 1,
    might: { current: 10, max: 10, edge: 0 },
    speed: { current: 10, max: 10, edge: 0 },
    intellect: { current: 10, max: 10, edge: 0 },
    damage: "Hale",
    stress: 0,
    notes: "",
    imported: false,
    fullData: null,
  };

  partyMembers.push(member);
  renderPartyList();
}

function importCharacterSheet() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        addImportedCharacter(data);
      } catch (error) {
        alert("Error reading character file: " + error.message);
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

function addImportedCharacter(data) {
  // Check if character already exists
  const existingIndex = partyMembers.findIndex(
    (m) => m.name === data.name && m.imported,
  );

  const member = {
    id: existingIndex >= 0 ? partyMembers[existingIndex].id : Date.now(),
    name: data.name || "Unknown",
    descriptor: data.descriptor || "",
    type: data.type || "",
    focus: data.focus1 || "",
    tier: data.tier || 1,
    xp: data.xp || 0,
    effort: data.effort || 1,
    might: {
      current: data.currentPools?.Might || data.mightPool?.current || 10,
      max: data.stats?.Might || data.mightPool?.max || 10,
      edge: data.edge?.Might || data.mightEdge || 0,
    },
    speed: {
      current: data.currentPools?.Speed || data.speedPool?.current || 10,
      max: data.stats?.Speed || data.speedPool?.max || 10,
      edge: data.edge?.Speed || data.speedEdge || 0,
    },
    intellect: {
      current:
        data.currentPools?.Intellect || data.intellectPool?.current || 10,
      max: data.stats?.Intellect || data.intellectPool?.max || 10,
      edge: data.edge?.Intellect || data.intellectEdge || 0,
    },
    damage: data.damageTrack || data.damageState || data.damage || "Hale",
    stress: data.stress || data.stressLevel || 0,
    cyphers: data.assignedCyphers || [],
    cypherLimit: data.cypherSlots || 2,
    notes: "",
    imported: true,
    fullData: {
      ...data,
      superStress: 10, // Always set max supernatural stress to 10
    },
    lastUpdated: new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    partyMembers[existingIndex] = member;
    alert(`Updated ${member.name}'s character data`);
  } else {
    partyMembers.push(member);
    alert(`Imported ${member.name}`);
  }

  renderPartyList();
}

function updateCharacterSheet(id) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        const member = partyMembers.find((m) => m.id === id);
        if (member && member.imported) {
          // Update with new data
          Object.assign(member, {
            name: data.name || member.name,
            descriptor: data.descriptor || member.descriptor,
            type: data.type || member.type,
            focus: data.focus1 || member.focus,
            tier: data.tier || member.tier,
            xp: data.xp || 0,
            effort: data.effort || member.effort,
            might: {
              current:
                data.currentPools?.Might ||
                data.mightPool?.current ||
                member.might.current,
              max: data.stats?.Might || data.mightPool?.max || member.might.max,
              edge: data.edge?.Might || data.mightEdge || member.might.edge,
            },
            speed: {
              current:
                data.currentPools?.Speed ||
                data.speedPool?.current ||
                member.speed.current,
              max: data.stats?.Speed || data.speedPool?.max || member.speed.max,
              edge: data.edge?.Speed || data.speedEdge || member.speed.edge,
            },
            intellect: {
              current:
                data.currentPools?.Intellect ||
                data.intellectPool?.current ||
                member.intellect.current,
              max:
                data.stats?.Intellect ||
                data.intellectPool?.max ||
                member.intellect.max,
              edge:
                data.edge?.Intellect ||
                data.intellectEdge ||
                member.intellect.edge,
            },
            damage:
              data.damageTrack ||
              data.damageState ||
              data.damage ||
              member.damage,
            stress: data.stress || data.stressLevel || member.stress,
            cyphers: data.assignedCyphers || member.cyphers,
            cypherLimit: data.cypherSlots || member.cypherLimit,
            fullData: {
              ...data,
              superStress: 10, // Always set max supernatural stress to 10
            },
            lastUpdated: new Date().toISOString(),
          });
          renderPartyList();
          alert(`Updated ${member.name}'s data`);
        }
      } catch (error) {
        alert("Error reading character file: " + error.message);
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

function toggleCharacterDetails(id) {
  const detailsDiv = document.getElementById(`details-${id}`);
  const arrow = document.getElementById(`arrow-${id}`);
  if (detailsDiv && arrow) {
    const isHidden = detailsDiv.style.display === "none";
    detailsDiv.style.display = isHidden ? "block" : "none";
    arrow.textContent = isHidden ? "▼" : "▶";
  }
}

function removePartyMember(id) {
  if (confirm("Remove this party member?")) {
    partyMembers = partyMembers.filter((m) => m.id !== id);
    renderPartyList();
  }
}

function updatePartyMember(id, field, value) {
  const member = partyMembers.find((m) => m.id === id);
  if (member) {
    let firebasePath = null;
    let firebaseValue = value;

    if (field.includes(".")) {
      const parts = field.split(".");
      if (parts.length === 2) {
        const [obj, prop] = parts;

        // Prevent current pool from exceeding max pool
        if (
          prop === "current" &&
          (obj === "might" || obj === "speed" || obj === "intellect")
        ) {
          const maxValue = member[obj].max;
          value = Math.min(value, maxValue);
        }

        member[obj][prop] = value;

        // Set Firebase path for syncing
        if (obj === "might" || obj === "speed" || obj === "intellect") {
          firebasePath = `${obj}Pool.${prop}`;
          firebaseValue = value;
        }
      } else if (parts.length === 3) {
        // Handle nested properties like fullData.supernaturalStress
        const [obj1, obj2, prop] = parts;
        if (!member[obj1]) member[obj1] = {};
        if (!member[obj1][obj2]) member[obj1][obj2] = {};

        // Prevent supernatural stress from exceeding max
        if (obj2 === "supernaturalStress" && member[obj1]?.superStress) {
          value = Math.min(value, member[obj1].superStress);
        }

        // Ensure supernatural stress never exceeds 10
        if (obj2 === "supernaturalStress") {
          value = Math.min(value, 10);
        }

        member[obj1][obj2] = value;

        // Set Firebase path
        if (obj2 === "supernaturalStress") {
          firebasePath = "supernaturalStress";
          firebaseValue = value;
        }
      }
    } else {
      member[field] = value;

      // Direct fields that sync to Firebase
      if (["stress", "damage", "xp", "tier", "effort"].includes(field)) {
        firebasePath = field === "damage" ? "damageTrack" : field;
        firebaseValue = value;
      }
    }

    // Sync to Firebase if player is connected via multiplayer
    if (
      member.multiplayerId &&
      firebasePath &&
      typeof multiplayerManager !== "undefined" &&
      multiplayerManager.roomCode
    ) {
      multiplayerManager.db
        .ref(
          `rooms/${multiplayerManager.roomCode}/players/${member.multiplayerId}/character/${firebasePath}`,
        )
        .set(firebaseValue)
        .catch((error) => console.error("Error syncing to player:", error));
    }

    savePartyData();
    renderPartyList();
  }
}

function renderPartyList() {
  const container = document.getElementById("partyMembersList");
  if (!container) return;

  if (partyMembers.length === 0) {
    container.innerHTML =
      '<p class="empty-state" style="text-align: center; color: #888; padding: 40px;">No party members yet. Import character sheets or add manually below.</p>';
    return;
  }

  // Store which details sections are currently expanded
  const expandedStates = {};
  partyMembers.forEach((member) => {
    const detailsDiv = document.getElementById(`details-${member.id}`);
    if (detailsDiv) {
      expandedStates[member.id] = detailsDiv.style.display !== "none";
    }
  });

  const isAvatar = (m) => m.fullData?.avatar?.isAvatar || false;
  const avatarEntity = (m) =>
    m.fullData?.avatar?.entityName || m.fullData?.avatar?.entity || "";

  const primaryColor = window.getThemeColor("primary");
  const primaryLight = window.getThemeColor("primaryLight");
  const primaryRgba = window.getThemeColor("primaryRgba");

  container.innerHTML = partyMembers
    .map(
      (member) => `
    <div class="party-member-card" style="background: linear-gradient(135deg, #1a1a1a 0%, #0d1a0d 100%); padding: 20px; border-radius: 10px; border: 3px solid ${
      isAvatar(member) ? "#8b0000" : primaryColor
    }; box-shadow: 0 4px 15px ${primaryRgba(0.3)}; position: relative;">
      
      <!-- Collapsed View -->
      <div style="cursor: pointer;" onclick="toggleCharacterDetails(${
        member.id
      })">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
          <span id="arrow-${
            member.id
          }" style="color: ${primaryColor}; font-size: 1.2em;">${
            expandedStates[member.id] ? "▼" : "▶"
          }</span>
          ${
            member.imported
              ? `<h3 style="margin: 0; color: ${
                  isAvatar(member) ? "#ff6b6b" : primaryColor
                }; font-size: 1.3em;">
                  ${member.name}
                  ${member.playerName ? `<span style="font-size: 0.7em; color: #888; font-weight: normal; margin-left: 10px;">(Player: ${member.playerName})</span>` : ""}
                  ${member.connected !== undefined ? (member.connected ? '<span style="color: #4caf50; font-size: 0.8em; margin-left: 10px;">🟢 Online</span>' : '<span style="color: #666; font-size: 0.8em; margin-left: 10px;">🔴 Offline</span>') : ""}
                </h3>`
              : `<input 
                  type="text" 
                  value="${member.name || ""}" 
                  placeholder="Character Name" 
                  onchange="updatePartyMember(${member.id}, 'name', this.value)"
                  onclick="event.stopPropagation()"
                  style="font-size: 1.2em; font-weight: bold; background: rgba(0,0,0,0.3); border: 1px solid ${primaryColor}; padding: 8px; border-radius: 4px; color: ${primaryColor};"
                />`
          }
          <span style="background: ${primaryRgba(
            0.2,
          )}; padding: 4px 10px; border-radius: 4px; color: ${primaryColor}; font-weight: bold; font-size: 0.9em;">Tier ${
            member.tier
          }</span>
        </div>
        <div style="color: #888; margin-left: 32px; font-size: 0.95em;">
          ${
            member.descriptor && member.type && member.focus
              ? `<em>${member.descriptor} ${member.type} who ${member.focus}</em>`
              : '<em style="color: #666;">No character statement</em>'
          }
          ${
            isAvatar(member) && avatarEntity(member)
              ? `<span style="color: #ff6b6b; margin-left: 10px;">• Serves ${avatarEntity(
                  member,
                )}</span>`
              : ""
          }
        </div>
      </div>
      
      <!-- Action Button Bar -->
      <div style="display: grid; grid-template-columns: repeat(${member.imported && isAvatar(member) ? "5" : member.imported || isAvatar(member) ? "4" : "3"}, 1fr); gap: 8px; margin-top: 15px;">
        ${
          member.imported
            ? `<div style="background: ${primaryRgba(0.2)}; border: 1px solid ${primaryColor}; padding: 10px; border-radius: 4px; font-size: 0.85em; color: ${primaryColor}; display: flex; align-items: center; justify-content: center; font-weight: bold;">📄 Imported</div>`
            : ""
        }
        ${
          isAvatar(member)
            ? '<div style="background: rgba(139, 0, 0, 0.3); border: 1px solid #8b0000; padding: 10px; border-radius: 4px; font-size: 0.85em; color: #ff6b6b; display: flex; align-items: center; justify-content: center; font-weight: bold; animation: avatarPulse 2s infinite;">👁️ Avatar</div>'
            : ""
        }
        <button onclick="event.stopPropagation(); customizePartyMemberToken(${
          member.id
        })" style="background: #9C27B0; border: none; color: white; padding: 10px; border-radius: 4px; cursor: pointer; font-size: 0.85em; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="Customize Battle Map Token">🎨 Token</button>
        <button onclick="event.stopPropagation(); addPartyMemberToCombat(${
          member.id
        })" style="background: #ff9800; border: none; color: white; padding: 10px; border-radius: 4px; cursor: pointer; font-size: 0.85em; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="Add to Combat Tracker">⚔️ Combat</button>
        <button onclick="event.stopPropagation(); removePartyMember(${
          member.id
        })" style="background: #d32f2f; border: none; color: white; padding: 10px; border-radius: 4px; cursor: pointer; font-size: 0.85em; font-weight: bold;">🗑️ Remove</button>
      </div>
      
      <!-- Expanded Details Section -->
      <div id="details-${member.id}" style="display: ${
        expandedStates[member.id] ? "block" : "none"
      }; margin-top: 20px; padding-top: 20px; border-top: 2px solid ${primaryRgba(
        0.3,
      )};">
        
        <!-- Progression Stats -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin-bottom: 15px;">
          <div style="padding: 15px; background: ${primaryRgba(
            0.1,
          )}; border-radius: 6px; border: 2px solid ${primaryRgba(0.3)};">
            <label style="color: ${primaryLight}; font-size: 0.9em; display: block; margin-bottom: 8px; font-weight: bold;">Tier</label>
            <div style="font-size: 1.8em; font-weight: bold; color: ${primaryColor}; text-align: center;">${
              member.tier
            }</div>
          </div>
          ${
            member.xp !== undefined
              ? `
          <div style="padding: 15px; background: ${primaryRgba(
            0.1,
          )}; border-radius: 6px; border: 2px solid ${primaryRgba(0.3)}; position: relative;">
            <label style="color: ${primaryLight}; font-size: 0.9em; display: block; margin-bottom: 8px; font-weight: bold;">XP</label>
            <div style="font-size: 1.8em; font-weight: bold; color: ${primaryColor}; text-align: center; margin-bottom: 8px;">${
              member.xp
            }</div>
            <button onclick="event.stopPropagation(); assignXPToPartyMember(${
              member.id
            })" class="button" style="width: 100%; padding: 6px; font-size: 0.8em; background: ${primaryRgba(
              0.2,
            )}; border: 1px solid ${primaryColor};">📈 Assign XP</button>
          </div>
          `
              : ""
          }
           ${
             member.effort !== undefined
               ? `
          <div style="padding: 15px; background: ${primaryRgba(
            0.1,
          )}; border-radius: 6px; border: 2px solid ${primaryRgba(0.3)};">
            <label style="color: ${primaryLight}; font-size: 0.9em; display: block; margin-bottom: 8px; font-weight: bold;">Effort</label>
            <div style="font-size: 1.8em; font-weight: bold; color: ${primaryColor}; text-align: center;">${
              member.effort
            }</div>
          </div>
          `
               : ""
           }
           </div>
        
        
        <!-- Stress & Damage -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin-bottom: 15px;">
          <div style="padding: 15px; background: rgba(255, 152, 0, 0.1); border-radius: 6px; border: 2px solid rgba(255, 152, 0, 0.3);">
            <label style="color: #ffb74d; font-size: 0.9em; display: block; margin-bottom: 8px; font-weight: bold;">Stress</label>
            <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 8px;">
              <div style="font-size: 1.8em; font-weight: bold; color: #ff9800;">${
                member.stress
              }</div>
              <span style="color: #888; font-size: 0.9em;">Level: <strong style="color: #ff9800;">${Math.floor(
                member.stress / 3,
              )}</strong></span>
            </div>
            <button onclick="event.stopPropagation(); assignStressToPartyMember(${
              member.id
            })" class="button" style="width: 100%; padding: 6px; font-size: 0.8em; background: rgba(255, 152, 0, 0.2); border: 1px solid #ff9800;">😰 Assign Stress</button>
          </div>
          ${
            member.fullData?.supernaturalStress !== undefined
              ? `
          <div style="padding: 15px; background: rgba(76, 175, 80, 0.1); border-radius: 6px; border: 2px solid rgba(76, 175, 80, 0.3);">
            <label style="color: #a5d6a7; font-size: 0.9em; display: block; margin-bottom: 8px; font-weight: bold;">Supernatural Stress</label>
            <div style="font-size: 1.8em; font-weight: bold; color: #4caf50; text-align: center; margin-bottom: 8px;">${member.fullData.supernaturalStress} / 10</div>
            <button onclick="event.stopPropagation(); assignSupernaturalStressToPartyMember(${member.id})" class="button" style="width: 100%; padding: 6px; font-size: 0.8em; background: rgba(76, 175, 80, 0.2); border: 1px solid #4caf50;">👁️ Assign</button>
          </div>
          `
              : ""
          }
           <div style="padding: 15px; background: rgba(244, 67, 54, 0.1); border-radius: 6px; border: 2px solid rgba(244, 67, 54, 0.3);">
            <label style="color: #ef5350; font-size: 0.9em; display: block; margin-bottom: 8px; font-weight: bold;">Damage State</label>
            <select onchange="updatePartyMember(${
              member.id
            }, 'damage', this.value)" style="width: 100%; font-size: 1.1em; padding: 8px; background: rgba(0,0,0,0.3); border: 1px solid rgba(244, 67, 54, 0.5); border-radius: 4px; color: #ef5350; font-weight: bold;">
              <option value="Hale" ${
                member.damage === "Hale" || member.damage === "hale"
                  ? "selected"
                  : ""
              }>Hale</option>
              <option value="Hurt" ${
                member.damage === "Hurt" || member.damage === "hurt"
                  ? "selected"
                  : ""
              }>Hurt</option>
              <option value="Impaired" ${
                member.damage === "Impaired" || member.damage === "impaired"
                  ? "selected"
                  : ""
              }>Impaired</option>
              <option value="Debilitated" ${
                member.damage === "Debilitated" ||
                member.damage === "debilitated"
                  ? "selected"
                  : ""
              }>Debilitated</option>
              <option value="Dead" ${
                member.damage === "Dead" || member.damage === "dead"
                  ? "selected"
                  : ""
              }>Dead</option>
            </select>
          </div>
        
         
        </div>
        
        <!-- Stat Pools (Read-Only) -->
        <div style="background: ${primaryRgba(
          0.05,
        )}; padding: 15px; border-radius: 8px; border: 1px solid ${primaryRgba(
          0.2,
        )}; margin-bottom: 15px;">
          <h4 style="margin: 0 0 10px 0; color: ${primaryColor};">Stat Pools</h4>
          <div style="display: grid; gap: 10px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="width: 80px; color: ${primaryLight}; font-weight: bold;">Might:</span>
              <span style="font-size: 1.2em; color: #ef5350; font-weight: bold;">${
                member.might.current
              } / ${member.might.max}</span>
              <span style="color: #888; margin-left: 15px; font-size: 0.9em;">Edge: <strong>${
                member.might.edge
              }</strong></span>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="width: 80px; color: ${primaryLight}; font-weight: bold;">Speed:</span>
              <span style="font-size: 1.2em; color: #42a5f5; font-weight: bold;">${
                member.speed.current
              } / ${member.speed.max}</span>
              <span style="color: #888; margin-left: 15px; font-size: 0.9em;">Edge: <strong>${
                member.speed.edge
              }</strong></span>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="width: 80px; color: ${primaryLight}; font-weight: bold;">Intellect:</span>
              <span style="font-size: 1.2em; color: #ab47bc; font-weight: bold;">${
                member.intellect.current
              } / ${member.intellect.max}</span>
              <span style="color: #888; margin-left: 15px; font-size: 0.9em;">Edge: <strong>${
                member.intellect.edge
              }</strong></span>
            </div>
          </div>
        </div>
        
        <!-- Character Arc -->
        ${
          member.fullData?.characterArc
            ? `
        <div style="margin-bottom: 15px; background: rgba(0,0,0,0.3); border-radius: 6px; border: 1px solid ${primaryColor}; padding: 12px; cursor: help;" title="${member.fullData.characterArc.arcNotes || member.fullData.characterArc.description || "Character Arc"}">
          <div style="font-weight: bold; color: #4CAF50; margin-bottom: 5px;">Character Arc</div>
          <div style="color: #ccc;">${
            member.fullData.characterArc.arcName ||
            member.fullData.characterArc.currentArc ||
            "No active arc"
          }</div>
        </div>
        `
            : ""
        }
        
        <!-- Skills -->
        ${
          member.fullData?.skillsData && member.fullData.skillsData.length > 0
            ? `
        <details style="margin-bottom: 15px; background: rgba(0,0,0,0.3); border-radius: 6px; border: 1px solid #4CAF50;">
          <summary style="padding: 12px; cursor: pointer; font-weight: bold; color: #4CAF50;">Skills (${
            member.fullData.skillsData.length
          })</summary>
          <div style="padding: 15px;">
            ${member.fullData.skillsData
              .map(
                (skill) => `
              <div style="margin-bottom: 8px;">
                <strong style="color: #66bb6a;">${skill.skill}</strong>
                <span style="color: #888; margin-left: 10px;">(${skill.stat})</span>
                <span style="color: #4CAF50; margin-left: 10px;">${skill.ability}</span>
              </div>
            `,
              )
              .join("")}
          </div>
        </details>
        `
            : ""
        }
        
        <!-- Abilities -->
        ${
          (member.fullData?.selectedTypeAbilities &&
            member.fullData.selectedTypeAbilities.length > 0) ||
          (member.fullData?.selectedFocusAbilities &&
            member.fullData.selectedFocusAbilities.length > 0)
            ? `
        <div style="margin-bottom: 15px; background: rgba(0,0,0,0.3); border-radius: 6px; border: 1px solid #4CAF50; padding: 12px;">
          <div style="font-weight: bold; color: #4CAF50; margin-bottom: 10px;">Abilities</div>
          <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            ${[
              ...(member.fullData?.selectedTypeAbilities || []).map((name) => ({
                name,
                source: "Type",
              })),
              ...(member.fullData?.selectedFocusAbilities || []).map(
                (name) => ({ name, source: "Focus" }),
              ),
            ]
              .map((ability) => {
                const abilityData =
                  typeof ABILITIES_DATA !== "undefined"
                    ? ABILITIES_DATA.find((a) => a.name === ability.name)
                    : null;
                const isSupernatural =
                  abilityData?.supernatural ||
                  ability.name.toLowerCase().includes("supernatural") ||
                  ability.name.toLowerCase().includes("entity") ||
                  ability.name.toLowerCase().includes("avatar");

                const description = abilityData
                  ? `${ability.name} (${ability.source})\\n\\nTier ${abilityData.tier}${abilityData.stat ? ` • ${abilityData.stat}` : ""}${abilityData.pointsRequired > 0 ? ` • ${abilityData.pointsRequired} points` : ""}\\n\\n${abilityData.description}`
                  : `${ability.name} (${ability.source})`;

                return `
              <span style="display: inline-block; padding: 6px 12px; background: ${
                isSupernatural
                  ? "rgba(139, 0, 139, 0.2)"
                  : "rgba(76, 175, 80, 0.15)"
              }; border: 1px solid ${
                isSupernatural ? "#8b008b" : "#4CAF50"
              }; border-radius: 4px; color: ${
                isSupernatural ? "#b19cd9" : "#a5d6a7"
              }; font-size: 0.85em; cursor: help;" title="${description.replace(
                /"/g,
                "&quot;",
              )}">
                ${ability.name}
              </span>
            `;
              })
              .join("")}
          </div>
        </div>
        `
            : ""
        }
        
        <!-- Cyphers -->
        ${
          member.cyphers && member.cyphers.length > 0
            ? `
        <details style="margin-bottom: 15px; background: rgba(0,0,0,0.3); border-radius: 6px; border: 1px solid #4CAF50;">
          <summary style="padding: 12px; cursor: pointer; font-weight: bold; color: #4CAF50;">Cyphers (${
            member.cyphers.length
          }/${member.cypherLimit || 2})</summary>
          <div style="padding: 15px;">
            ${member.cyphers
              .map(
                (cypher, idx) => `
              <div style="margin-bottom: 10px; padding: 8px; background: rgba(76, 175, 80, 0.1); border-radius: 4px;">
                <strong style="color: #4CAF50;">${
                  cypher.name || "Unknown Cypher"
                }</strong>
                ${
                  cypher.level
                    ? `<span style="color: #ff9800; margin-left: 8px;">Level ${cypher.level}</span>`
                    : ""
                }
                ${
                  cypher.effect
                    ? `<div style="color: #ccc; font-size: 0.9em; margin-top: 4px;">${cypher.effect}</div>`
                    : ""
                }
              </div>
            `,
              )
              .join("")}
          </div>
        </details>
        `
            : ""
        }
        
        <!-- Avatar Section -->
        ${
          isAvatar(member)
            ? `
        <div style="background: linear-gradient(135deg, #2a0000 0%, #1a0000 100%); padding: 15px; border-radius: 8px; border: 2px solid #8b0000; margin-bottom: 15px;">
          <h4 style="margin: 0 0 10px 0; color: #ff6b6b;">👁️ Avatar Status</h4>
          <div style="color: #ccc; margin-bottom: 10px;">
            <strong style="color: #ff6b6b;">Entity:</strong> ${avatarEntity(
              member,
            )}
          </div>
          ${
            member.fullData?.avatar?.tetheredPowerName
              ? `
            <div style="color: #ccc;"><strong style="color: #ff6b6b;">Tethered Power:</strong> ${member.fullData.avatar.tetheredPowerName}</div>
          `
              : ""
          }
          ${
            member.fullData?.avatar?.powerChanges !== undefined
              ? `
            <div style="color: #ccc;"><strong style="color: #ff6b6b;">Power Changes:</strong> ${member.fullData.avatar.powerChanges}</div>
          `
              : ""
          }
        </div>
        `
            : ""
        }
        
        <!-- GM Notes -->
        <div style="margin-top: 15px;">
          <label style="display: block; margin-bottom: 5px; color: #888; font-weight: bold;">GM Notes</label>
          <textarea 
            placeholder="Private notes about this character..." 
            onchange="updatePartyMember(${member.id}, 'notes', this.value)"
            style="width: 100%; min-height: 80px; background: rgba(0,0,0,0.3); border: 1px solid #4CAF50; padding: 8px; border-radius: 4px; color: #e0e0e0;"
          >${member.notes || ""}</textarea>
        </div>
      </div>
    </div>
  `,
    )
    .join("");

  savePartyData();
}

function savePartyData() {
  localStorage.setItem("gmTool_partyMembers", JSON.stringify(partyMembers));
  updateDashboardPartyStats();
}

function loadPartyData() {
  const saved = localStorage.getItem("gmTool_partyMembers");
  if (saved) {
    partyMembers = JSON.parse(saved);
    renderPartyList();
  }
}

function updateDashboardPartyStats() {
  const partySize = document.getElementById("partySize");
  const avgTier = document.getElementById("avgTier");
  const activePlayers = document.getElementById("activePlayers");

  if (partySize) partySize.textContent = partyMembers.length;
  if (activePlayers) activePlayers.textContent = partyMembers.length;

  if (avgTier && partyMembers.length > 0) {
    const avg =
      partyMembers.reduce((sum, m) => sum + m.tier, 0) / partyMembers.length;
    avgTier.textContent = avg.toFixed(1);
  }
}

// Initialize on load
document.addEventListener("DOMContentLoaded", () => {
  loadPartyData();
});

// Assignment functions for GM
function assignXPToPartyMember(memberId) {
  const member = partyMembers.find((m) => m.id === memberId);
  if (!member) return;

  showPartyPushDialog("xp", memberId, member.name);
}

function assignStressToPartyMember(memberId) {
  const member = partyMembers.find((m) => m.id === memberId);
  if (!member) return;

  showPartyPushDialog("stress", memberId, member.name);
}

function assignSupernaturalStressToPartyMember(memberId) {
  const member = partyMembers.find((m) => m.id === memberId);
  if (!member) return;

  showPartyPushDialog("supernatural", memberId, member.name);
}

/**
 * Show styled push dialog for party members
 */
function showPartyPushDialog(type, memberId, memberName) {
  let modal = document.getElementById("partyPushDialog");
  if (!modal) {
    modal = createPartyPushDialog();
    document.body.appendChild(modal);
  }

  const title =
    type === "stress"
      ? "Assign Stress"
      : type === "supernatural"
        ? "Assign Supernatural Stress"
        : "Assign XP";
  const icon = type === "stress" ? "😰" : type === "supernatural" ? "👁️" : "📈";
  const amountLabel =
    type === "xp"
      ? "XP Amount"
      : type === "stress"
        ? "Stress Amount"
        : "Supernatural Stress Amount";

  document.getElementById("partyPushDialogTitle").innerHTML =
    `${icon} ${title}`;
  document.getElementById("partyPushDialogPlayer").textContent = memberName;
  document.getElementById("partyPushDialogAmountLabel").textContent =
    amountLabel + ":";
  document.getElementById("partyPushDialogAmount").value = "1";
  document.getElementById("partyPushDialogReason").value = "";

  const submitBtn = document.getElementById("partyPushDialogSubmit");
  submitBtn.onclick = () => submitPartyPushDialog(type, memberId, memberName);

  modal.style.display = "flex";
  setTimeout(
    () => document.getElementById("partyPushDialogAmount").focus(),
    100,
  );
}

/**
 * Create styled push dialog modal
 */
function createPartyPushDialog() {
  const modal = document.createElement("div");
  modal.id = "partyPushDialog";
  modal.style.cssText = `
    display: none;
    position: fixed;
    z-index: 10000;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0,0,0,0.8);
    align-items: center;
    justify-content: center;
  `;

  modal.innerHTML = `
    <div style="
      background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
      border: 2px solid #d4a574;
      border-radius: 8px;
      width: 90%;
      max-width: 450px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    ">
      <div style="
        background: #1a1a1a;
        border-bottom: 2px solid #d4a574;
        padding: 15px 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      ">
        <h3 id="partyPushDialogTitle" style="margin: 0; color: #d4a574;">Assign</h3>
        <button onclick="closePartyPushDialog()" style="
          background: transparent;
          color: #d4a574;
          border: none;
          font-size: 1.5em;
          cursor: pointer;
          padding: 0;
          width: 30px;
          height: 30px;
        ">✕</button>
      </div>
      <div style="padding: 20px;">
        <div style="margin-bottom: 15px; color: #aaa; font-size: 0.9em;">
          Party Member: <span id="partyPushDialogPlayer" style="color: #d4a574; font-weight: bold;"></span>
        </div>
        
        <div style="margin-bottom: 15px;">
          <label id="partyPushDialogAmountLabel" for="partyPushDialogAmount" style="display: block; margin-bottom: 5px; color: #d4a574; font-weight: bold;">Amount:</label>
          <input type="number" id="partyPushDialogAmount" min="1" value="1" style="
            width: 100%;
            padding: 10px;
            background: rgba(0,0,0,0.3);
            border: 1px solid #555;
            border-radius: 4px;
            color: #e0e0e0;
            font-size: 1.1em;
            box-sizing: border-box;
          " />
        </div>
        
        <div style="margin-bottom: 20px;">
          <label for="partyPushDialogReason" style="display: block; margin-bottom: 5px; color: #d4a574; font-weight: bold;">Reason (Optional):</label>
          <input type="text" id="partyPushDialogReason" placeholder="e.g., Failed intimidation check" style="
            width: 100%;
            padding: 10px;
            background: rgba(0,0,0,0.3);
            border: 1px solid #555;
            border-radius: 4px;
            color: #e0e0e0;
            font-size: 1em;
            box-sizing: border-box;
          " />
        </div>
        
        <div style="display: flex; gap: 10px;">
          <button id="partyPushDialogSubmit" style="
            flex: 1;
            background: #d4a574;
            color: #1a1a1a;
            border: none;
            padding: 12px;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
            font-size: 1em;
          ">Assign</button>
          <button onclick="closePartyPushDialog()" style="
            flex: 1;
            background: rgba(255,255,255,0.1);
            color: #e0e0e0;
            border: 1px solid #555;
            padding: 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 1em;
          ">Cancel</button>
        </div>
      </div>
    </div>
  `;

  return modal;
}

/**
 * Close party push dialog
 */
function closePartyPushDialog() {
  const modal = document.getElementById("partyPushDialog");
  if (modal) modal.style.display = "none";
}

/**
 * Submit party push dialog
 */
function submitPartyPushDialog(type, memberId, memberName) {
  const amount = parseInt(
    document.getElementById("partyPushDialogAmount").value,
  );
  const reason = document.getElementById("partyPushDialogReason").value;

  if (isNaN(amount) || amount <= 0) {
    alert("Please enter a valid positive number");
    return;
  }

  const member = partyMembers.find((m) => m.id === memberId);
  if (!member) {
    alert("Party member not found");
    closePartyPushDialog();
    return;
  }

  if (type === "xp") {
    const newXP = (member.xp || 0) + amount;
    updatePartyMember(memberId, "xp", newXP);

    if (
      member.multiplayerId &&
      typeof multiplayerManager !== "undefined" &&
      multiplayerManager.roomCode
    ) {
      multiplayerManager.db
        .ref(
          `rooms/${multiplayerManager.roomCode}/players/${member.multiplayerId}/character/xp`,
        )
        .set(newXP)
        .catch((error) => console.error("Error syncing XP to player:", error));
    }

    alert(
      `✅ Assigned ${amount} XP to ${memberName}. New total: ${newXP}${reason ? `\\nReason: ${reason}` : ""}`,
    );
  } else if (type === "stress") {
    const newStress = (member.stress || 0) + amount;
    updatePartyMember(memberId, "stress", newStress);

    if (
      member.multiplayerId &&
      typeof multiplayerManager !== "undefined" &&
      multiplayerManager.roomCode
    ) {
      multiplayerManager.db
        .ref(
          `rooms/${multiplayerManager.roomCode}/players/${member.multiplayerId}/character/stress`,
        )
        .set(newStress)
        .catch((error) =>
          console.error("Error syncing stress to player:", error),
        );
    }

    const newLevel = Math.floor(newStress / 3);
    alert(
      `✅ Assigned ${amount} Stress to ${memberName}. New total: ${newStress} (Level ${newLevel})${reason ? `\\nReason: ${reason}` : ""}`,
    );
  } else if (type === "supernatural") {
    const currentSuper = member.fullData?.supernaturalStress || 0;
    const newSuper = Math.min(currentSuper + amount, 10);
    updatePartyMember(memberId, "fullData.supernaturalStress", newSuper);

    if (
      member.multiplayerId &&
      typeof multiplayerManager !== "undefined" &&
      multiplayerManager.roomCode
    ) {
      multiplayerManager.db
        .ref(
          `rooms/${multiplayerManager.roomCode}/players/${member.multiplayerId}/character/supernaturalStress`,
        )
        .set(newSuper)
        .catch((error) =>
          console.error("Error syncing supernatural stress to player:", error),
        );
    }

    if (newSuper >= 10) {
      alert(
        `⚠️ WARNING: ${memberName} has reached maximum Supernatural Stress (10/10)!\\n\\nThey have been touched by the Entities and may take a supernatural aspect.${reason ? `\\nReason: ${reason}` : ""}`,
      );
    } else {
      alert(
        `✅ Assigned ${amount} Supernatural Stress to ${memberName}. New total: ${newSuper}/10${reason ? `\\nReason: ${reason}` : ""}`,
      );
    }
  }

  closePartyPushDialog();
}
