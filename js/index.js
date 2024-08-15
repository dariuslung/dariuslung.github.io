const construction = document.getElementById('construction');
const text = 'Under construction.';
var count = 0;

const addDots = () => {
    count += 1;
    count = count % 4;
    construction.innerText = text;
    for (let i = 0; i < count; i++) {
        construction.innerText += '.';
    }
}

addDots();
setInterval(addDots, 500);