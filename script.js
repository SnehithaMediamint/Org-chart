const csvUrl = "https://docs.google.com/spreadsheets/d/1f35n_acicq6vS9oR1NDCJL5BvHOJ5GxqSMN1t4vIBXA/export?format=csv&gid=1957984317";

const titleColors = {
  "Chief Delivery Officer": "#81d4fa",
  "Senior Vice President": "#a5d6a7",
  "Vice President": "#f48fb1",
  "Associate President": "#ce93d8",
  "Senior Director": "#ffcc80",
  "Director": "#b39ddb",
  "Associate Director": "#ffab91",
  "Senior Manager": "#80cbc4",
  "Manager": "#fff59d",
  "Associate Manager": "#aed581",
  "Team Leads": "#90caf9",
  "default": "#eeeeee"
};

const legendData = Object.entries(titleColors).filter(([key]) => key !== "default");

const legendContainer = d3.select("#chart")
  .append("div")
  .attr("id", "legend")
  .style("position", "absolute")
  .style("top", "10px")
  .style("right", "10px")
  .style("background", "#222")
  .style("padding", "15px")
  .style("border-radius", "8px")
  .style("color", "#fff")
  .style("font-size", "11px")
  .style("box-shadow", "0 2px 10px rgba(75, 65, 65, 0.62)");

legendContainer.append("div")
  .style("font-weight", "bold")
  .style("margin-bottom", "6px")
  .text("Legend");

legendContainer.selectAll("div.legend-item")
  .data(legendData)
  .enter()
  .append("div")
  .attr("class", "legend-item")
  .style("display", "flex")
  .style("align-items", "center")
  .style("margin-bottom", "4px")
  .html(([title, color]) => `
    <div style="width:14px;height:14px;background:${color};border-radius:3px;margin-right:8px;border:1px solid #444;"></div>
    <span>${title}</span>
  `);

async function fetchAndFormatData() {
  const response = await fetch(csvUrl);
  const csvText = await response.text();
  const rows = d3.csvParse(csvText);

  return rows.map(row => ({
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
    projectscount: row.projectscount?.trim() || "",
    customerscount: row.customerscount?.trim() || "",
    trainees: row.trainees?.trim() || "",
  }));
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

function collapse(node) {
  if (node.children) {
    node._children = node.children;
    node._children.forEach(collapse);
    node.children = null;
  }
}

function toggle(d) {
  const parent = d.parent;

  if (parent && parent.children) {
    parent.children.forEach(sibling => {
      if (sibling !== d && sibling.children) {
        sibling._children = sibling.children;
        sibling._children.forEach(collapse);
        sibling.children = null;
      }
    });
  }

  if (d.children) {
    d._children = d.children;
    d._children.forEach(collapse);
    d.children = null;
  } else {
    d.children = d._children;
    d._children = null;
  }
}

// function zoomToNode(svg, g, d, zoom) {
//   const scale = 1.2;
//   const translateX = -d.x + 400;
//   const translateY = -d.y + 200;

//   svg.transition()
//     .duration(750)
//     .call(
//       zoom.transform,
//       d3.zoomIdentity.translate(translateX, translateY).scale(scale)
//     );
// }

function initChart(rootData) {
  const CARD_WIDTH = 290;
  const CARD_HEIGHT = 150;
  const HORIZONTAL_SPACING = 40;
  const VERTICAL_SPACING = CARD_HEIGHT + 60;

  const svg = d3.select("#chart").append("svg");
  const g = svg.append("g");

  // const zoom = d3.zoom().on("zoom", (event) => {
  //   g.attr("transform", event.transform);
  // });
//  svg.call(zoom).on("wheel.zoom", null).on("dblclick.zoom", null).on("mousedown.zoom", null);

  const root = d3.hierarchy(rootData);
  root.x0 = 0;
  root.y0 = 0;
  const treeLayout = d3.tree().nodeSize([CARD_WIDTH + HORIZONTAL_SPACING, VERTICAL_SPACING]);
  root.children?.forEach(collapse);
  update(root);

  function update(source) {
    treeLayout(root);
    const nodes = root.descendants();
    const links = root.links();

    const xMin = d3.min(nodes, d => d.x) - CARD_WIDTH;
    const xMax = d3.max(nodes, d => d.x) + CARD_WIDTH;
    const yMin = d3.min(nodes, d => d.y) - CARD_HEIGHT / 2 - 40;
    const yMax = d3.max(nodes, d => d.y) + CARD_HEIGHT / 2 + 40;
    const width = xMax - xMin + 100;
    const height = yMax - yMin + 120;

    svg.attr("viewBox", [xMin, yMin, width, height]);

    const linkSel = g.selectAll("path.link")
      .data(links, d => d.target.data.id);

    linkSel.enter()
      .append("path")
      .attr("class", "link")
      .attr("fill", "none")
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
      .attr("transform", d => `translate(${source.x0},${source.y0})`);

    nodeEnter.append("rect")
      .attr("x", -CARD_WIDTH / 2)
      .attr("y", -CARD_HEIGHT / 2)
      .attr("width", CARD_WIDTH)
      .attr("height", CARD_HEIGHT)
      .attr("rx", 10)
      .attr("ry", 10)
      .attr("stroke", "#ccc")
      .attr("fill", d => titleColors[d.data.title] || titleColors["default"]);

    const DEFAULT_AVATAR = "https://cdn-icons-png.flaticon.com/512/149/149071.png";
    nodeEnter.append("image")
      .attr("xlink:href", DEFAULT_AVATAR)
      .attr("x", -CARD_WIDTH / 2 + 10)
      .attr("y", -CARD_HEIGHT / 2 + 10)
      .attr("width", 50)
      .attr("height", 50)
      .attr("clip-path", "circle(25px at center)");

    nodeEnter.each(function (d) {
      let group = d3.select(this);
      let offsetY = -CARD_HEIGHT / 2 + 20;

      const nameText = group.append("text")
        .attr("x", -CARD_WIDTH / 2 + 70)
        .attr("y", offsetY)
        .attr("font-size", "12px")
        .attr("fill", "black")
        .attr("font-weight", "bold");

      wrapText(nameText, d.data.name, -CARD_WIDTH / 2 + 70);
      offsetY += nameText.selectAll("tspan").size() * 14;

      const fields = [
        { fn: d => d.data.title },
        { fn: d => d.data.billable && `${d.data.billable} B`, color: "green", weight: "bold" },
        { fn: d => d.data.nonbillable && `${d.data.nonbillable} F`, color: "red", weight: "bold" },
        { fn: d => d.data.projectscount && `${d.data.projectscount} Projects`, color: "#1976d2", weight: "bold" },
        { fn: d => d.data.customerscount && `${d.data.customerscount} Customers`, color: "#6a1b9a", weight: "bold" },
        { fn: d => d.data.trainees && `T-${d.data.trainees}`, color: "#ef6c00", weight: "bold" },
      ];

      fields.forEach(({ fn, color = "black", weight = "normal" }) => {
        const val = fn(d);
        if (val) {
          const text = group.append("text")
            .attr("x", -CARD_WIDTH / 2 + 70)
            .attr("y", offsetY)
            .attr("font-size", "12px")
            .attr("fill", color)
            .attr("font-weight", weight);
          wrapText(text, val, -CARD_WIDTH / 2 + 70);
          offsetY += 18;
        }
      });
    });

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
        update(d);
        // zoomToNode(svg, g, d, zoom); // <- Zoom into the clicked node
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
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const data = await fetchAndFormatData();
  const orgChartData = buildHierarchy(data);
  initChart(orgChartData);
});
