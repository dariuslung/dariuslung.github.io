Fancybox.bind('[data-fancybox]', {
        // Your custom options
});    

const about_carousel = new Carousel(document.getElementById('card_slider'), {
    Navigation: {
        prevTpl:
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M11 5l-7 7 7 7"/><path d="M4 12h16"/></svg>',
        nextTpl:
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M4 12h16"/><path d="M13 5l7 7-7 7"/></svg>',
    },
    infinite: true,
    center: true,
    slidesPerPage: 1,
    transition: false,
});

setTimeout(() => {
    about_carousel.reInit();
}, 50);