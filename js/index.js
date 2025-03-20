Fancybox.bind('[data-fancybox]', {
        // Your custom options
});    

const about_carousel = new Carousel(document.getElementById('card_slider'), {
    infinite: true,
    center: true,
    slidesPerPage: 1,
    transition: false,
    on: {
        load: () => {
            // Recalculate elements metrics since slide sizes are dynamic
            // console.log("loaded");
            about_carousel.updateMetrics();
            about_carousel.slideTo(0);
        },
    },
});