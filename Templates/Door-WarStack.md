<%*
const domain = await tp.system.prompt("Domain (BODY/BEING/BALANCE/BUSINESS)");
const subdomain = await tp.system.prompt("Subdomain");
const door = await tp.system.prompt("Domino Door");
const trigger = await tp.system.prompt("Trigger");
const narrative = await tp.system.prompt("Narrative");
const validation = await tp.system.prompt("Validation");
const impact = await tp.system.prompt("Impact of opening");
const consequences = await tp.system.prompt("Consequences of not opening");
const week = tp.date.now("YYYY-[W]WW");
const date = tp.date.now("YYYY-MM-DD");
const domain_tag = domain ? domain.toLowerCase() : "";
%>
---
date: <%= date %>
week: <%= week %>
title: "<%= door %>"
domain: <%= domain %>
subdomain: <%= subdomain %>
door: "<%= door %>"
door_uuid: ""
profit_uuid: ""
hit_uuids: ["", "", "", ""]
tags: [war-stack, door, production, <%= domain_tag %>]
---

# War Stack - <%= door %>

## Domain & Sub-domain
- Domain: <%= domain %>
- Sub-domain: <%= subdomain %>

## Domino Door
<%= door %>

## Trigger
<%= trigger %>

## Narrative
<%= narrative %>

## Validation
<%= validation %>

## Impact of opening
<%= impact %>

## Consequences of not opening
<%= consequences %>

---

## The Four Hits

### Hit 1
- Fact:
- Obstacle:
- Strike:
- Responsibility: Me

### Hit 2
- Fact:
- Obstacle:
- Strike:
- Responsibility: Me

### Hit 3
- Fact:
- Obstacle:
- Strike:
- Responsibility: Me

### Hit 4
- Fact:
- Obstacle:
- Strike:
- Responsibility: Me

---

## Insights


## Lessons


---

## Taskwarrior UUIDs (Bridge/Taskwarrior)

- Door UUID:
- Profit UUID:
- Hit 1 UUID:
- Hit 2 UUID:
- Hit 3 UUID:
- Hit 4 UUID:

---

## Taskwarrior Implementation (manual)

```bash
# Weekly Door
task add "Weekly Door: <%= domain %> Focus" pillar:door project:<%= domain %> due:friday

# Strategic Hits
task add "Hit1: " project:<%= domain %> due:tuesday
task add "Hit2: " project:<%= domain %> due:wednesday
task add "Hit3: " project:<%= domain %> due:thursday
task add "Hit4: " project:<%= domain %> due:friday
```
