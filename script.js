d3.json('data.json').then(function(data) {
    const nodes = data.nodes;
    const links = data.links;

    // Grouping
    nodes.forEach(n => {
        if ([
            "Heavy Rainfall", "Glacier Melt", "Natural Disasters", "Soil Erosion", "Rising River Beds",
            "Load Bearing Capacity", "River Embankments", "Landslides", "Flora & Fauna Loss"
        ].includes(n.id)) n.group = "natural";
        else if ([
            "Population Boom", "Waste Management", "Plastic Dumping", "Poor Drainage", "Concrete Cover",
            "Housing Demand", "Support Systems", "Material Demand", "Mining", "Machines", "Fuel Consumption",
            "Technological Growth", "Transport Systems", "Waste Generation", "Energy Demand",
            "Dam Construction", "Fossil Fuels", "Deforestation"
        ].includes(n.id)) n.group = "anthropogenic";
        else if ([
            "Urban Flooding", "River Floods", "Food Chain Disruption", "River Communities",
            "Reduced Agricultural Yield", "Import Dependency", "Increased Energy Costs"
        ].includes(n.id)) n.group = "impact";
        else if ([
            "Governance", "Zoning Regulations", "Building Codes", "Disaster Management Plans",
            "Early Warning Systems", "Infrastructure Maintenance", "Relocation Policy",
            "Agricultural Policy", "Energy Policy", "International Water Agreements"
        ].includes(n.id)) n.group = "governance";
        else if (n.id.toLowerCase().includes("disaster") || n.id.toLowerCase().includes("flood") || n.id.toLowerCase().includes("community")) n.group = "disaster";
        else n.group = "crosscutting";
    });

    const svg = d3.select("svg")
        .attr("width", window.innerWidth)
        .attr("height", window.innerHeight)
        .on("click", backgroundClick);

    const container = svg.append("g").attr("id", "graph");

    const width = window.innerWidth;
    const height = window.innerHeight;

    const stickyNodes = ["Urban Flooding", "River Floods", "Governance", "Disaster Management"];

    const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.id).distance(90))
        .force("charge", d3.forceManyBody().strength(-80))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collide", d3.forceCollide().radius(30).strength(0.7))
        .velocityDecay(0.35)
        .on("tick", ticked);

    const link = container.append("g")
        .selectAll("line")
        .data(links)
        .enter().append("line")
        .attr("class", "link")
        .attr("marker-end", "url(#arrow)");

    const node = container.append("g")
        .selectAll("circle")
        .data(nodes)
        .enter().append("circle")
        .attr("class", d => `node ${d.group}`)
        .attr("r", 8)
        .on("click", handleNodeClick)
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));

    const label = container.append("g")
        .selectAll("text")
        .data(nodes)
        .enter().append("text")
        .attr("text-anchor", "middle")
        .attr("dy", -12)
        .text(d => d.id);

    const zoom = d3.zoom()
        .scaleExtent([0.5, 5])
        .on("zoom", (event) => {
            container.attr("transform", event.transform);
        });

    svg.call(zoom);

    function ticked() {
        link.attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        node.attr("cx", d => d.x = limitX(d.x))
            .attr("cy", d => d.y = limitY(d.y));

        label.attr("x", d => d.x)
            .attr("y", d => d.y);
    }

    function limitX(x) {
        return Math.max(50, Math.min(width - 50, x));
    }

    function limitY(y) {
        return Math.max(50, Math.min(height - 50, y));
    }

    function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(event, d) {
        d.fx = limitX(event.x);
        d.fy = limitY(event.y);
    }

    function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        if (!stickyNodes.includes(d.id)) {
            d.fx = null;
            d.fy = null;
        }
    }

    let selectedNodes = [];

    function handleNodeClick(event, d) {
        event.stopPropagation();
        if (!selectedNodes.includes(d)) {
            if (selectedNodes.length === 2) resetSelection();
            selectedNodes.push(d);
            d3.select(this).classed("selected", true);
            if (selectedNodes.length === 2) {
                highlightPathAnyOrder(selectedNodes[0], selectedNodes[1]);
            }
        }
    }

    function backgroundClick() {
        resetSelection();
    }

    function resetSelection() {
        selectedNodes = [];
        d3.selectAll(".link").classed("highlighted", false);
        d3.selectAll(".node").classed("selected", false);
        d3.select("#explanation").text("Select 2 nodes to reveal the connection");
    }

    function highlightPathAnyOrder(nodeA, nodeB) {
        let found = false;
        const pathLinks = new Set();
        const pathNodes = [];
        const graph = new Map();
        nodes.forEach(n => graph.set(n.id, []));
        links.forEach(l => graph.get(l.source.id).push(l.target.id));

        function dfs(current, target, path, visited) {
            if (current === target) {
                for (let i = 0; i < path.length - 1; i++) {
                    pathLinks.add(`${path[i]}->${path[i + 1]}`);
                }
                pathNodes.push(...path);
                found = true;
                return;
            }
            visited.add(current);
            for (const neighbor of graph.get(current) || []) {
                if (!visited.has(neighbor)) {
                    dfs(neighbor, target, [...path, neighbor], visited);
                    if (found) return;
                }
            }
        }

        dfs(nodeA.id, nodeB.id, [nodeA.id], new Set());
        if (!found) dfs(nodeB.id, nodeA.id, [nodeB.id], new Set());

        link.classed("highlighted", d => pathLinks.has(`${d.source.id}->${d.target.id}`));

        if (found) {
            document.getElementById('explanation').innerText = `Path: ${pathNodes.join(' → ')}`;
        } else {
            document.getElementById('explanation').innerText = `No directed path found between selected nodes.`;
        }
    }
});
