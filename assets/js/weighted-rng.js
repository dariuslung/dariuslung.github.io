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

// PREMIUM HIGHLIGHT CLASSES
const defaultClasses = ["border-gray-200", "dark:border-gray-600", "bg-gray-50", "dark:bg-gray-900"];
// We use a blue border and soft blue background for the winner so text remains readable
const highlightClasses = ["border-blue-500", "dark:border-blue-500", "bg-blue-50", "dark:bg-blue-900/20", "ring-1", "ring-blue-500"];

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
    if (sum === 0) return;

    const rng = Math.random() * sum;
    let acc = .0;
    
    for (let i = 0; i < inputs.length; i++) {
        acc += parseFloat(inputs[i].querySelector('input[name="weight"]').value);
        if (rng < acc) {
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
const height = 350; // slightly shorter for a sleeker look
const marginTop = 20;
const marginRight = 20;
const marginBottom = 30;
const marginLeft = 40;
const sample_size = 10000;

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
        .attr("class", "w-full h-auto font-sans text-gray-600 dark:text-gray-400");

    const labels = Array.from(data).map(d => d.label);
    const x = d3.scaleBand()
        .domain(labels)
        .range([marginLeft, width - marginRight])
        .padding([0.2]); // Increased padding for sleeker bars

    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.frequency)]).nice()
        .range([height - marginBottom, marginTop]);
    
    // Draw Bars with gradient-like solid color
    svg.append("g")
        .attr("fill", "#4f46e5") // Tailwind indigo-600
        .selectAll("rect")
        .data(data)
        .join("rect")
        .attr("x", d => x(d.label))
        .attr("y", d => y(d.frequency))
        .attr("height", d => y(0) - y(d.frequency))
        .attr("width", x.bandwidth())
        .attr("rx", 6) // Highly rounded corners
        .attr("class", "opacity-90 hover:opacity-100 transition-opacity"); // Hover effect on bars

    // X-axis
    const xAxis = svg.append("g")
        .attr("transform", `translate(0,${height - marginBottom})`)
        .call(d3.axisBottom(x).tickSizeOuter(0));

    // Y-axis
    const yAxis = svg.append("g")
        .attr("transform", `translate(${marginLeft},0)`)
        .call(d3.axisLeft(y).ticks(5).tickSizeOuter(0)); // Less cluttered ticks

    // Style axes for Dark Mode compatibility
    svg.selectAll(".domain").attr("stroke", "currentColor").attr("opacity", "0.2");
    svg.selectAll(".tick line").attr("stroke", "currentColor").attr("opacity", "0.1");
    svg.selectAll(".tick text").attr("fill", "currentColor").attr("font-size", "13px").attr("font-weight", "500");

    dstb_container.append(svg.node());
});

// Load first 3 inputs by default to show off the UI
if(input_container) {
    add_input();
    add_input();
    add_input();
}