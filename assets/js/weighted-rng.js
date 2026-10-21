import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const sample_input = document.getElementById("sample_input");
const input_container = document.getElementById("input_container");

// Add input
function add_input() {
    const count = input_container.children.length;
    const new_input = sample_input.cloneNode(true);
    new_input.id = `input_${count}`;
    new_input.querySelector("button").addEventListener("click", remove_input);
    new_input.querySelector('input[name="label"]').placeholder = `Item Label ${count + 1}`;
    
    new_input.classList.remove("hidden");
    new_input.classList.add("flex");
    
    input_container.appendChild(new_input);
}

const add_input_btn = document.getElementById("add_input_btn");
if(add_input_btn) add_input_btn.addEventListener("click", add_input);

// Remove input
function remove_input(event) {
    const btn = event.target.closest('button');
    const input = btn.parentElement;
    input.remove();
    reassign_id();
}

// Reassign id and placeholder
function reassign_id() {
    const inputs = input_container.children;
    for (let i = 0; i < inputs.length; i++) {
        inputs[i].id = `input_${i}`;
        inputs[i].querySelector('input[name="label"]').placeholder = `Item Label ${i + 1}`;
    }
}

// Only accept positive weight
function check_negative_weight() {
    const inputs = input_container.children;
    Array.from(inputs).forEach(input => {
        const weight = input.querySelector('input[name="weight"]');
        const val = parseFloat(weight.value);
        if (val < 0) weight.value = 0;
    });
}

// Highlight classes
const defaultClasses = ["border-rule", "bg-paper"];
// Accent border plus a faint accent tint for the winner so text remains readable
const highlightClasses = ["border-signal", "bg-signal/10", "ring-1", "ring-signal"];

// Winner banner
const rng_result = document.getElementById("rng_result");
const rng_winner = document.getElementById("rng_winner");
const rng_prob = document.getElementById("rng_prob");

function show_result(label, weight, total) {
    rng_winner.textContent = label;
    rng_prob.textContent = `${weight} / ${total} = ${formatPercent(weight / total)}`;
    rng_result.classList.remove("hidden");
}

function formatPercent(fraction) {
    return `${parseFloat((fraction * 100).toFixed(2))}%`;
}

// Generate random number
const rand_btn = document.getElementById("rand_btn");
if(rand_btn) rand_btn.addEventListener("click", () => {
    check_negative_weight();
    const inputs = input_container.children;
    let sum = .0;

    Array.from(inputs).forEach(input => input.querySelectorAll('.item-input').forEach(inputField => {
        // Reset classes
        inputField.classList.remove(...highlightClasses);
        inputField.classList.add(...defaultClasses);
        
        if (inputField.name === "weight") {
            sum += parseFloat(inputField.value);
        }
    }));
    
    // Quick guard to prevent NaN if weight is 0
    if (sum === 0) {
        rng_result.classList.add("hidden");
        return;
    }

    const rng = Math.random() * sum;
    let acc = .0;

    for (let i = 0; i < inputs.length; i++) {
        const weight = parseFloat(inputs[i].querySelector('input[name="weight"]').value);
        acc += weight;
        if (rng < acc) {
            const label_input = inputs[i].querySelector('input[name="label"]');
            show_result(label_input.value === "" ? label_input.placeholder : label_input.value, weight, sum);
            // Apply highlight classes to the winning inputs
            inputs[i].querySelectorAll('.item-input').forEach(inputField => {
                inputField.classList.remove(...defaultClasses);
                inputField.classList.add(...highlightClasses);
            });
            break;
        }
    }
});

// Distribution Chart Logic
const dstb_btn = document.getElementById("dstb_btn");
const dstb_container = document.getElementById("dstb_container");

const width = 800; 
const height = 350; 
const marginTop = 20;
const marginRight = 20;
const marginBottom = 70;
const marginLeft = 60;
const sample_size = 1000000;

if(dstb_btn) dstb_btn.addEventListener("click", () => {
    if (dstb_container.children.length > 0) {
        dstb_container.innerHTML = ""; 
    }
    check_negative_weight();
    
    const inputs = input_container.children;
    let sum = .0;
    let acc = [];
    let data = [];
    
    Array.from(inputs).forEach(input => input.querySelectorAll('.item-input').forEach(inputField => {
        if (inputField.name === "label") {
            let label = inputField.value === "" ? inputField.placeholder : inputField.value;
            data.push({"label": label, "frequency": 0});
        }
        else if (inputField.name === "weight") {
            sum += parseFloat(inputField.value);
            acc.push(sum);
        }
    }));
    
    if (sum === 0) return;

    for (let i = 0; i < sample_size; i++) {
        const rng = Math.random() * sum;
        let left = 0;
        let right = acc.length - 1;
        let target;
        while (left <= right) {
            target = Math.floor((right - left) / 2 + left);
            if (rng < acc[target] && rng >= (target === 0 ? 0 : acc[target - 1])) {
                data[target].frequency++;
                break;
            }
            else if (rng < acc[target]) right = target - 1;
            else left = target + 1;
        }
    }

    const svg = d3.create("svg")
        .attr("viewBox", [0, 0, width, height])
        .attr("class", "w-full h-auto font-mono text-muted");

    const labels = Array.from(data).map(d => d.label);
    const x = d3.scaleBand()
        .domain(labels)
        .range([marginLeft, width - marginRight])
        .padding([0.2]); 

    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.frequency)]).nice()
        .range([height - marginBottom, marginTop]);
    
    // Colours come from the CSS tokens, so the chart follows the active theme.
    const total_samples = d3.sum(data, d => d.frequency);
    const fmt_count = d3.format(",");

    // Bars, each with a native tooltip showing the exact count and share
    svg.append("g")
        .style("fill", "rgb(var(--c-signal))")
        .selectAll("rect")
        .data(data)
        .join("rect")
        .attr("x", d => x(d.label))
        .attr("y", d => y(d.frequency))
        .attr("height", d => y(0) - y(d.frequency))
        .attr("width", x.bandwidth())
        .attr("class", "hover:opacity-80")
        .append("title")
        .text(d => `${d.label}: ${fmt_count(d.frequency)} (${formatPercent(d.frequency / total_samples)})`);

    // Exact counts above the bars, when the bars are wide enough to fit them
    if (x.bandwidth() >= 56) {
        svg.append("g")
            .style("fill", "rgb(var(--c-ink))")
            .attr("text-anchor", "middle")
            .attr("font-size", "12px")
            .selectAll("text")
            .data(data)
            .join("text")
            .attr("x", d => x(d.label) + x.bandwidth() / 2)
            .attr("y", d => y(d.frequency) - 6)
            .text(d => fmt_count(d.frequency));
    }

    // X-axis
    const xAxis = svg.append("g")
        .attr("transform", `translate(0,${height - marginBottom})`)
        .call(d3.axisBottom(x).tickSizeOuter(0));

    // Rotate X-axis labels to prevent overlapping
    xAxis.selectAll("text")
        .attr("transform", "translate(-10, 0) rotate(-45)")
        .style("text-anchor", "end");

    // Y-axis
    const yAxis = svg.append("g")
        .attr("transform", `translate(${marginLeft},0)`)
        // Format ticks using ~s (e.g., 1000000 -> 1M) to reduce width
        .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format("~s")).tickSizeOuter(0)); 

    // Style axes for Dark Mode compatibility
    svg.selectAll(".domain").attr("stroke", "currentColor").attr("opacity", "0.2");
    svg.selectAll(".tick line").attr("stroke", "currentColor").attr("opacity", "0.1");
    svg.selectAll(".tick text").attr("fill", "currentColor").attr("font-size", "12px");

    dstb_container.append(svg.node());
});

// Load first 3 inputs by default to show off the UI
if(input_container) {
    add_input();
    add_input();
    add_input();
}