// ==UserScript==
// @name         MAL Prettifier
// @namespace    http://tampermonkey.net/
// @version      7
// @description  Makes certain parts of MAL prettier
// @author       Matty
// @match        *://myanimelist.net/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=myanimelist.net
// @grant        none
// @updateURL    https://github.com/MathiasLui/mal-prettify/raw/main/mal-prettify.user.js
// @downloadURL  https://github.com/MathiasLui/mal-prettify/raw/main/mal-prettify.user.js
// ==/UserScript==

(function() {
    'use strict';

    function log(message) {
        console.log('[Tampermonkey-MAL-Prettify] ' + message);
    }

    function styleAnimeList() {
        // Styles specific to /animelist page
        log('Applying options for /animelist');

        var css = `
        .status-menu .status-button span {
            display: inline-block; /* Allows the span to be transformed */
            transition: transform 0.2s ease; /* Smooth transition */
        }

        .status-menu .status-button:hover span {
            transform: translateY(-5px); /* Moves the text up */
        }

        #loaded-anime-count {
            position: absolute;
            height: 38px;
            line-height: 38px;
            left: 12px;
        }

        #list-container {
            border-radius: 20px;
        }

        .list-block .list-unit .list-status-title {
            border-top-left-radius: 10px;
            border-top-right-radius: 10px;
        }

        .status-menu-container .search-container #search-box {
            margin-right: 5px;
        }

        .status-menu-container .search-container #search-box input {
            width: 100%;
            height: 20px; /* Adjust the height as needed */
            box-sizing: border-box;
            border-radius: 10px; /* Rounded corners */
            border-width: 0;
            outline: none;
            padding: 0 5px; /* Optional: Adds some padding inside the input */
        }

        /* Placeholder styling */
        .status-menu-container .search-container #search-box input::placeholder {
            color: #aaa; /* Light grey color; adjust as needed */
        }
        `;

        // Add styles
        var style = document.createElement('style');
        style.innerHTML = css;
        document.head.appendChild(style);

        // Placeholder text
        let inputBox = document.querySelector('#search-box > input:first-of-type');
        inputBox.setAttribute('placeholder','Anime');

        // Animate the buttons
        // Select all elements with the class 'status-button'
        const buttons = document.querySelectorAll('.status-menu .status-button');

        // Loop through each 'status-button' element
        buttons.forEach(function(button) {
            // Store the current inner HTML of the button
            const currentHTML = button.innerHTML;

            // Wrap the current inner HTML in a <span> and update the button's content
            // This way we can apply pretty transformations to the text itself
            button.innerHTML = `<span>${currentHTML}</span>`;
        });

        // Prepare the updateAnimeStats function for use
        function updateAnimeStats() {
            log('Updating Anime stats');

            let listUnit = document.querySelector('#list-container .list-block .list-unit');
            let isCompletedPage = listUnit.classList.contains('completed');
            let animeTable = listUnit.querySelector('.list-table');
            let loadedItems = animeTable.querySelectorAll('.list-item');
            let loadedCount = loadedItems.length;

            // Get average completion
            let totalCompletion = 0;
            let totalEpisodes = 0;

            loadedItems.forEach(item => {
                // Find the element with both "data" and "progress" classes
                let dataProgressElement = item.querySelector('.list-table-data .data.progress');

                if (dataProgressElement) {
                    let completionIsNumber = false;
                    let totalIsNumber = false;
                    // the first span contains an <a> element and the second span contains the progress directly
                    let spans = dataProgressElement.querySelectorAll('div > span');
                    if (spans.length === 2) {
                        // We have a "a / b" situation whether either is either a number or a -
                        // Extract number from the <a> element inside the first span
                        let aElement = spans[0].querySelector('a');
                        let completion = aElement ? parseInt(aElement.innerHTML, 10) : 0;
                        // Check if the value is a number before adding to total
                        if (!isNaN(completion)) {
                            // We have watched at least 1 episode
                            completionIsNumber = true;
                            totalCompletion += completion;
                        }

                        // Extract number directly from the second span's innerHTML
                        let progress = parseInt(spans[1].innerHTML, 10);
                        // Check if the value is a number before adding to total
                        if (!isNaN(progress)) {
                            totalIsNumber = true;
                            totalEpisodes += progress;
                        }
                        else {
                            // Anime likely hasn't finished yet so let's set both to the same equaling 100%
                            if (completionIsNumber) {
                                // We have completed some. If this isn't true then we have neither watched nor has the anime finished.
                                // This may occur when it hasn't finished and we haven't watched anything or if the anime isn't out yet
                                totalEpisodes += completion;
                            }
                        }
                    } else if (spans.length === 1) {
                        // We don't have a second number, meaning the anime is completed or hasn't aired yet
                        let progress = parseInt(spans[0].innerHTML, 10);
                        if (!isNaN(progress)) {
                            totalCompletion += progress;
                            totalEpisodes += progress;
                        }
                    }
                }
            });

            let averageCompletion = (totalCompletion / totalEpisodes) * 100;

            let loadedCountElement = document.querySelector('#loaded-anime-count');
            if (!loadedCountElement) {
                loadedCountElement = document.createElement('div');
                loadedCountElement.setAttribute('id','loaded-anime-count');
                let listTitle = listUnit.querySelector('.list-status-title');
                listTitle.appendChild(loadedCountElement);
            }
            loadedCountElement.innerHTML = `<b style="font-size: 12px">${loadedCount}</b> Anime${loadedCount === 1 ? '' : 's'} loaded`;
            if (!isCompletedPage) {
                loadedCountElement.innerHTML += ` with <b style="font-size: 12px">${averageCompletion.toFixed(2)}%</b> ${loadedCount === 1 ? '' : 'average '}completion`;
            }
        }

        // Run initially to set the count
        updateAnimeStats();

        // Observing the loading-spinner
        const loadingSpinner = document.getElementById('loading-spinner');

        // Check if loadingSpinner exists
        if (loadingSpinner) {
            const observer = new MutationObserver(function(mutationsList, observer) {
                for(const mutation of mutationsList) {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                        // Whenever the loading spinner stops spinning the count changes (except the last time) so update it in the UI
                        if (loadingSpinner.style.display === 'none') {
                            log('Anime loading has stopped. Updating count...');
                            updateAnimeStats();
                        } else {
                            log('Loading has started...');
                        }
                    }
                }
            });

            // Set up the observer options: observe "style" attribute changes specifically
            const config = { attributes: true, attributeFilter: ['style'] };

            // Start observing the target node for configured mutations
            observer.observe(loadingSpinner, config);
        } else {
            log('Loading spinner not found.');
        }
    }

    function styleProfile() {
        // JavaScript and styling for the profile page
        log('Applying options for /profile');

        const css = `
        .btn-profile-submit {
            border-radius: 10px;
        }
        `;
        
        // Add styles
        var style = document.createElement('style');
        style.innerHTML = css;
        document.head.appendChild(style);
    }

    function styleMainPage() {
        // JavaScript and styling for the main page
        log('Applying options for /');

        const css = `
        ul li.ranking-unit > span.rank {
            display: none !important;
        }

        ul li.ranking-unit:nth-child(1) {
            background: linear-gradient(180deg, gold -30%, transparent 90%);
        }

        ul li.ranking-unit:nth-child(2) {
            background: linear-gradient(180deg, silver -30%, transparent 90%);
        }

        ul li.ranking-unit:nth-child(3) {
            background: linear-gradient(180deg, #CD7F32 -30%, transparent 90%);
        }
        
        ul li.ranking-unit .data .h3_side .title {
            text-shadow: 0px 0px 6px black;
        }

        ul li.ranking-unit {
            padding-top: 8px !important;
        }
        
        ul li.ranking-unit .data > a {
            border-radius: 10px;
            padding: 4px 7px !important;
            margin-top: 5px !important;
        }
        `;
        
        // Add styles
        var style = document.createElement('style');
        style.innerHTML = css;
        document.head.appendChild(style);
    }

    function applyGlobalStyles() {
        // Common CSS/JS that apply to all pages
        log('Applying global options');

        const css = `
        a.header-profile-button {
            border-radius: 50%;
        }

        a.header-profile-button:hover {
            border-radius: 0;
        }

        .wrapper #menu {
            border-top-left-radius: 10px;
            border-top-right-radius: 10px;
            padding-left: 6px;
            width: 1054px !important; /* Original width minus padding */
            background: linear-gradient(90deg, #2e51a2 34%, orange 140%);
        }
        `;
        
        // Add styles
        var style = document.createElement('style');
        style.innerHTML = css;
        document.head.appendChild(style);
    }

    // Main execution block
    if (window.location.pathname.startsWith('/animelist')) {
        styleAnimeList();
    } else if (window.location.pathname.startsWith('/profile')) {
        styleProfile();
    } else if (window.location.pathname === '/') {
        styleMainPage();
    }

    applyGlobalStyles();
})();
