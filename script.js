const csvUrl = "https://docs.google.com/spreadsheets/d/1f35n_acicq6vS9oR1NDCJL5BvHOJ5GxqSMN1t4vIBXA/export?format=csv&gid=1957984317";

async function fetchAndFormatData() {
  const response = await fetch(csvUrl);
  const csvText = await response.text();
  const rows = d3.csvParse(csvText);

  const formatted = rows.map(row => ({
    id: row.id?.trim(),
    name: row.name?.trim(),
    parent_id: row.parent_id?.trim(),
    title: row.title?.trim(),
    img: row.img?.trim(),
    office: row.office?.trim() || "",
    location: row.location?.trim() || "",
    billable: row.billable?.trim() || "",
    nonbillable: row.nonbillable?.trim() || "",
    projects: row.projects?.trim() || "",
  projectscount: row.projectscount?.trim() || "",     // ✅ added
  customerscount: row.customerscount?.trim() || "", 
    trainees: row.trainees?.trim() || "", 
  }));

  return formatted;
}

function buildHierarchy(data) {
  const dataMap = new Map(data.map(item => [item.id, { ...item, children: [] }]));
  let rootNode = null;

  data.forEach(item => {
    if (!item.parent_id) {
      rootNode = dataMap.get(item.id);
    } else {
      const parent = dataMap.get(item.parent_id);
      if (parent) {
        parent.children.push(dataMap.get(item.id));
      }
    }
  });
  return rootNode;
}

document.addEventListener("DOMContentLoaded", async () => {
  const data = await fetchAndFormatData();
  const orgChartData = buildHierarchy(data);
  initChart(orgChartData);
});

function wrapText(textSelection, text, x, maxCharsPerLine = 28) {
  const words = text.split(/\s+/);
  let line = [];
  let dy = 0;
  const lineHeight = 14;

  for (let i = 0; i < words.length; i++) {
    line.push(words[i]);
    const testLine = line.join(" ");
    if (testLine.length > maxCharsPerLine || i === words.length - 1) {
      textSelection.append("tspan")
        .attr("x", x)
        .attr("dy", dy === 0 ? "0em" : "1.2em")
        .text(testLine);
      line = [words[i]];
      dy += lineHeight;
    }
  }
}

function initChart(rootData) {
  const CARD_WIDTH = 290;
  const CARD_HEIGHT = 140;
  const HORIZONTAL_SPACING = 40;
  const VERTICAL_SPACING = 100;

  const svg = d3.select("#chart").append("svg");
  const g = svg.append("g");

  const root = d3.hierarchy(rootData);
  root.x0 = 0;
  root.y0 = 0;

  const treeLayout = d3.tree()
    .nodeSize([CARD_WIDTH + HORIZONTAL_SPACING, CARD_HEIGHT + VERTICAL_SPACING]);

  root.children?.forEach(collapse);
  update(root);

  function update(source) {
    treeLayout(root);
    const nodes = root.descendants();
    const links = root.links();

    const xMin = d3.min(nodes, d => d.x) - CARD_WIDTH;
    const xMax = d3.max(nodes, d => d.x) + CARD_WIDTH;
    const yMin = d3.min(nodes, d => d.y) - CARD_HEIGHT;
    const yMax = d3.max(nodes, d => d.y) + CARD_HEIGHT;
    const width = xMax - xMin + 100;
    const height = yMax - yMin + 100;

    svg.attr("viewBox", [xMin, yMin, width, height]);

    const linkSel = g.selectAll("path.link")
      .data(links, d => d.target.data.id);

    linkSel.enter()
      .append("path")
      .attr("class", "link")
      .attr("stroke", "#ccc")
      .attr("fill", "none")
      .attr("stroke-width", 2)
      .merge(linkSel)
      .attr("d", d => `
        M${d.source.x},${d.source.y + CARD_HEIGHT / 2}
        V${(d.source.y + d.target.y) / 2}
        H${d.target.x}
        V${d.target.y - CARD_HEIGHT / 2}
      `);

    linkSel.exit().remove();

    const nodeSel = g.selectAll("g.node")
      .data(nodes, d => d.data.id);

    const nodeEnter = nodeSel.enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", () => `translate(${source.x0},${source.y0})`);

    nodeEnter.append("rect")
      .attr("x", -CARD_WIDTH / 2)
      .attr("y", -CARD_HEIGHT / 2)
      .attr("width", CARD_WIDTH)
      .attr("height", CARD_HEIGHT)
      .attr("rx", 10)
      .attr("ry", 10)
      .attr("fill", "#fff")
      .attr("stroke", "#ccc");

    // nodeEnter.append("image")
    //   .attr("xlink:href", d => d.data.img)
    //   .attr("x", -CARD_WIDTH / 2 + 10)
    //   .attr("y", -CARD_HEIGHT / 2 + 10)
    //   .attr("width", 50)
    //   .attr("height", 50)
    //   .attr("clip-path", "circle(25px at center)");
    const DEFAULT_AVATAR = "https://cdn-icons-png.flaticon.com/512/149/149071.png"; // You can change to any avatar icon

nodeEnter.append("image")
  .attr("xlink:href",  DEFAULT_AVATAR)
  .attr("x", -CARD_WIDTH / 2 + 10)
  .attr("y", -CARD_HEIGHT / 2 + 10)
  .attr("width", 50)
  .attr("height", 50)
  .attr("clip-path", "circle(25px at center)");

    // Name (wrapped)
    nodeEnter.append("text")
      .attr("x", -CARD_WIDTH / 2 + 70)
      .attr("y", -CARD_HEIGHT / 2 + 20)
      .attr("font-size", "14px")
      .attr("font-weight", "bold")
      .each(function (d) {
        wrapText(d3.select(this), d.data.name || "", -CARD_WIDTH / 2 + 70);
      });

    // Title (wrapped)
    nodeEnter.append("text")
      .attr("x", -CARD_WIDTH / 2 + 70)
      .attr("y", -CARD_HEIGHT / 2 + 50)
      .attr("font-size", "11px")
      .each(function (d) {
        wrapText(d3.select(this), d.data.title || "", -CARD_WIDTH / 2 + 70);
      });

   // Projects Count (moved slightly down for margin)
nodeEnter.append("text")
  .attr("x", -CARD_WIDTH / 2 + 70)
  .attr("y", -CARD_HEIGHT / 2 + 85) // 🔼 added margin from 100 → 105
  .attr("font-size", "12px")
  .attr("fill", "#1976d2")
  .attr("font-weight", "bold")
  .each(function (d) {
    const val = d.data.projectscount?.trim();
    if (val) wrapText(d3.select(this), `${val} Projects`, -CARD_WIDTH / 2 + 70);
  });

// Customers Count (also moved down)
// Customers Count
nodeEnter.append("text")
  .attr("x", -CARD_WIDTH / 2 + 70)
  .attr("y", -CARD_HEIGHT / 2 + 105)
  .attr("font-size", "12px")
  .attr("fill", "#6a1b9a")
  .attr("font-weight", "bold")
  .each(function (d) {
    const val = d.data.customerscount?.trim();
    if (val) wrapText(d3.select(this), `${val} Customers`, -CARD_WIDTH / 2 + 70);
  });

// Trainees Count (moved below Customers Count)
nodeEnter.append("text")
  .attr("x", -CARD_WIDTH / 2 + 70)
  .attr("y", -CARD_HEIGHT / 2 + 135)  // 💡 update y-position
  .attr("font-size", "12px")
  .attr("fill", "#ef6c00")
  .attr("font-weight", "bold")
  .each(function (d) {
    const val = d.data.trainees?.trim();
    if (val) wrapText(d3.select(this), `T-${val} `, -CARD_WIDTH / 2 + 70);
  });


    // Billable
    nodeEnter.append("text")
      .attr("x", -CARD_WIDTH / 2 + 70)
      .attr("y", -CARD_HEIGHT / 2 + 70)
      .attr("font-size", "12px")
      .attr("fill", "#388e3c")
      .attr("font-weight", "bold")
      .each(function (d) {
        const val = d.data.billable?.trim();
        if (val) wrapText(d3.select(this), `${val} B`, -CARD_WIDTH / 2 + 70);
      });

    // Non-billable
    nodeEnter.append("text")
      .attr("x", -CARD_WIDTH / 2 + 70)
      .attr("y", -CARD_HEIGHT / 2 + 85)
      .attr("font-size", "12px")
      .attr("fill", "#d32f2f")
      .attr("font-weight", "bold")
      .each(function (d) {
        const val = d.data.nonbillable?.trim();
        if (val) wrapText(d3.select(this), `${val} F`, -CARD_WIDTH / 2 + 70);
      });

    // Projects
    // nodeEnter.append("text")
    //   .attr("x", -CARD_WIDTH / 2 + 70)
    //   .attr("y", -CARD_HEIGHT / 2 + 80)
    //   .attr("font-size", "12px")
    //   .attr("fill", "#1976d2")
    //   .attr("font-weight", "bold")
    //   .each(function (d) {
    //     const val = d.data.projects?.trim();
    //     if (val) wrapText(d3.select(this), `${val} P`, -CARD_WIDTH / 2 + 70);
    //   });

    // Office + Location
    nodeEnter.append("text")
      .attr("x", -CARD_WIDTH / 2 + 10)
      .attr("y", CARD_HEIGHT / 2 - 10)
      .attr("font-size", "10px")
      .attr("fill", "gray")
      .each(function (d) {
        const office = d.data.office?.trim() || "";
        const location = d.data.location?.trim() || "";
        const full = [office, location].filter(Boolean).join(" ");
        wrapText(d3.select(this), full, -CARD_WIDTH / 2 + 10);
      });

    // Toggle button
    nodeEnter.append("circle")
      .attr("class", "toggle-btn")
      .attr("cx", 0)
      .attr("cy", CARD_HEIGHT / 2 - 10)
      .attr("r", 10)
      .attr("fill", "#f2f2f2")
      .attr("stroke", "#555")
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        event.stopPropagation();
        toggle(d);
        update(root);
      });

    nodeEnter.append("text")
      .attr("class", "toggle-icon")
      .attr("x", 0)
      .attr("y", CARD_HEIGHT / 2 - 6)
      .attr("text-anchor", "middle")
      .attr("font-size", "14px")
      .attr("pointer-events", "none")
      .text(d => d.children ? "−" : d._children ? "+" : "");

    const nodeMerge = nodeEnter.merge(nodeSel);
    nodeMerge.transition().duration(300)
      .attr("transform", d => `translate(${d.x},${d.y})`);

    nodeMerge.select(".toggle-icon")
      .text(d => d.children ? "−" : d._children ? "+" : "");

    nodeSel.exit().remove();
    linkSel.exit().remove();

    nodes.forEach(d => {
      d.x0 = d.x;
      d.y0 = d.y;
    });
  }

  function toggle(d) {
    if (d.children) {
      d._children = d.children;
      d._children.forEach(collapse);
      d.children = null;
    } else {
      d.children = d._children;
      d._children = null;
    }
  }

  function collapse(node) {
    if (node.children) {
      node._children = node.children;
      node._children.forEach(collapse);
      node.children = null;
    }
  }
}
