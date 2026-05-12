// Ensure Fancybox exists before binding (prevents errors on other pages)
if (typeof Fancybox !== "undefined") {
    Fancybox.bind('[data-fancybox]', {
        // Your custom options
    });    
}

const sliderEl = document.getElementById('card_slider');

// Ensure the Carousel object and DOM element exist
if (sliderEl && typeof Carousel !== "undefined") {
    const about_carousel = new Carousel(sliderEl, {
        infinite: true,
        center: true,
        slidesPerPage: 1,
        Autoplay: {
            timeout: 6000,
            pauseOnHover: true,
            showProgress: false
        }
    },{ Autoplay });
}