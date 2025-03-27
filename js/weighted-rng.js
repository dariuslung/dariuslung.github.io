const sample_input = document.getElementById("sample_input");
const input_container = document.getElementById("input_container");

function add_input() {
    const count = input_container.children.length;
    const new_input = sample_input.cloneNode(true);
    new_input.id = `input_${count}`;
    new_input.querySelector("button").addEventListener("click", remove_input);
    new_input.querySelector('input[name="label"]').placeholder = `Label ${count}`;
    new_input.classList.remove("collapse");
    input_container.appendChild(new_input);
}

function remove_input(event) {
    const input = event.target.parentElement;
    input.remove();
    reassign_id();
}

function reassign_id() {
    const inputs = input_container.children;
    for (let i = 0; i < inputs.length; i++) {
        inputs[i].id = `input_${i}`;
        inputs[i].querySelector('input[name="label"]').placeholder = `Label ${i+1}`;
    }
}

const add_input_btn = document.getElementById("add_input_btn");
add_input_btn.addEventListener("click", add_input);

const rand_btn = document.getElementById("rand_btn");
const rand_result = document.getElementById("rand_result");
rand_btn.addEventListener("click", () => {
    const inputs = input_container.children;
    // Reset colours
    let total = 0;
    Array.from(inputs).forEach(input => input.querySelectorAll('input').forEach(input => {
        input.classList.remove("bg-success", "text-light", "placeholder-light");
        if (input.name === "weight") {
            total += parseInt(input.value);
        }
    }));
    const rng = Math.floor(Math.random() * total);
    let sum = 0;
    for (let i = 0; i < inputs.length; i++) {
        sum += parseInt(inputs[i].querySelector('input[name="weight"]').value);
        if (rng < sum) {
            // Highlight the selected input
            inputs[i].querySelectorAll('input').forEach(input => input.classList.add("bg-success", "text-light", "placeholder-light"));
            break;
        }
    }
});

const dstb_btn = document.getElementById("dstb_btn");



// Add first input by default
add_input();