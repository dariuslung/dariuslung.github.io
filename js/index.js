// Under construction animation
const construction = document.getElementById('construction');
const text = 'Under construction.';
var count = 0;

const addDots = () => {
    count += 1;
    count = count % 4;
    construction.innerText = text;
    construction.innerText += '.'.repeat(count);
}

addDots();
setInterval(addDots, 500);

