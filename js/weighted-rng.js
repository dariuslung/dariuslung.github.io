import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const sample_input = document.getElementById("sample_input");
const input_container = document.getElementById("input_container");

// Add input
function add_input() {
    const count = input_container.children.length;
    const new_input = sample_input.cloneNode(true);
    new_input.id = `input_${count}`;
    new_input.querySelector("button").addEventListener("click", remove_input);
    new_input.querySelector('input[name="label"]').placeholder = `Label ${count}`;
    new_input.classList.remove("collapse");
    input_container.appendChild(new_input);
}

const add_input_btn = document.getElementById("add_input_btn");
add_input_btn.addEventListener("click", add_input);

// Remove input
function remove_input(event) {
    const input = event.target.parentElement;
    input.remove();
    reassign_id();
}

// Reassign id and placeholder
function reassign_id() {
    const inputs = input_container.children;
    for (let i = 0; i < inputs.length; i++) {
        inputs[i].id = `input_${i}`;
        inputs[i].querySelector('input[name="label"]').placeholder = `Label ${i+1}`;
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

// Generate random number
const rand_btn = document.getElementById("rand_btn");
rand_btn.addEventListener("click", () => {
    check_negative_weight();
    const inputs = input_container.children;
    let sum = .0;
    Array.from(inputs).forEach(input => input.querySelectorAll('input').forEach(input => {
        // Reset colours
        input.classList.remove("bg-success", "text-light", "placeholder-light");
        if (input.name === "weight") {
            sum += parseFloat(input.value);
        }
    }));
    const rng = Math.random() * sum;
    let acc = .0;
    for (let i = 0; i < inputs.length; i++) {
        acc += parseFloat(inputs[i].querySelector('input[name="weight"]').value);
        if (rng < acc) {
            // Highlight the selected input
            inputs[i].querySelectorAll('input').forEach(input => input.classList.add("bg-success", "text-light", "placeholder-light"));
            break;
        }
    }
});

// Distribution
const dstb_btn = document.getElementById("dstb_btn");
const dstb_container = document.getElementById("dstb_container");

// Declare the chart dimensions and margins.
const static_width = 640;
const static_height = 400;
const width = dstb_container.clientWidth;
const height = width * static_height / static_width;
const marginTop = 20;
const marginRight = 20;
const marginBottom = 30;
const marginLeft = 40;
const sample_size = 10000;

// Declare the x (horizontal position) scale.
const x = d3.scaleBand()
.domain([])
.range([marginLeft, width - marginRight])
.padding([0.1]);

// Declare the y (vertical position) scale.
const y = d3.scaleLinear()
.domain([0, sample_size])
.range([height - marginBottom, marginTop]);

// Create the SVG container.
const svg = d3.create("svg")
.attr("width", width)
.attr("height", height);

// Add the x-axis.
svg.append("g")
.attr("transform", `translate(0,${height - marginBottom})`)
.call(d3.axisBottom(x));

// Add the y-axis.
svg.append("g")
.attr("transform", `translate(${marginLeft},0)`)
.call(d3.axisLeft(y));

// Append the SVG element.
dstb_container.append(svg.node());

// Generate distribution
dstb_btn.addEventListener("click", () => {
    if (dstb_container.children.length > 0) {
        d3.selectAll("g > *").remove()
    }
    check_negative_weight();
    // Random 10000 times
    const inputs = input_container.children;
    let sum = .0;
    let acc = [];
    let data = [];
    Array.from(inputs).forEach(input => input.querySelectorAll('input').forEach(input => {
        if (input.name === "label") {
            let label;
            if (input.value === "") label = input.placeholder;
            else label = input.value;
            data.push({"label": label, "frequency": 0});
        }
        else if (input.name === "weight") {
            sum += parseFloat(input.value);
            acc.push(sum);
        }
    }));
    for (let i = 0; i < 10000; i++) {
        const rng = Math.random() * sum;
        // Count frequency with binary search
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

    // Declare the x (horizontal position) scale.
    const labels = Array.from(data).map(d => d.label);
    const x = d3.scaleBand()
    .domain(labels)
    .range([marginLeft, width - marginRight])
    .padding([0.1]);

    // Declare the y (vertical position) scale.
    const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.frequency)]).nice()
    .range([height - marginBottom, marginTop]);
    
    // Append the bars.
    svg.append("g")
    .attr("class", "bars")
    .attr("fill", "steelblue")
    .selectAll("rect")
    .data(data)
    .join("rect")
    .attr("x", d => x(d.label))
    .attr("y", d => y(d.frequency))
    .attr("height", d => y(0) - y(d.frequency))
    .attr("width", x.bandwidth());

    // Add the x-axis.
    svg.append("g")
    .attr("transform", `translate(0,${height - marginBottom})`)
    .call(d3.axisBottom(x));

    // Add the y-axis.
    svg.append("g")
    .attr("transform", `translate(${marginLeft},0)`)
    .call(d3.axisLeft(y));
});

// Add first input by default
add_input();