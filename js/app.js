// --- app.js ---
document.addEventListener("DOMContentLoaded", () => {
    
    // --- DOM Elements ---
    const themeToggleBtn = document.getElementById("themeToggleBtn");
    
    const filterSection = document.getElementById("filterSection");
    const rouletteSection = document.getElementById("rouletteSection");
    const resultSection = document.getElementById("resultSection");
    
    const filterForm = document.getElementById("filterForm");
    const readyBtn = document.getElementById("readyBtn");
    const formError = document.getElementById("formError");
    
    const spinBtn = document.getElementById("spinBtn");
    const spinAgainBtn = document.getElementById("spinAgainBtn");
    const editFiltersBtn = document.getElementById("editFiltersBtn");
    
    // Roulette Wheels
    const wheelRegionSlots = document.querySelector("#wheelRegion .slots-container");
    const wheelStyleSlots = document.querySelector("#wheelStyle .slots-container");
    const wheelTypeSlots = document.querySelector("#wheelType .slots-container");

    // Result UI Elements
    const resName = document.getElementById("resName");
    const resShortDesc = document.getElementById("resShortDesc");
    const resWhyFit = document.getElementById("resWhyFit");
    const resRegion = document.getElementById("resRegion");
    const resLength = document.getElementById("resLength");
    const resDuration = document.getElementById("resDuration");
    const resDifficulty = document.getElementById("resDifficulty");
    const resRouteType = document.getElementById("resRouteType");
    const resDriveDist = document.getElementById("resDriveDist");
    const resElevation = document.getElementById("resElevation");
    const resStart = document.getElementById("resStart");
    const resEnd = document.getElementById("resEnd");
    const resHighlights = document.getElementById("resHighlights");
    const resFood = document.getElementById("resFood");
    const resBringSeason = document.getElementById("resBringSeason");
    const resMapsLink = document.getElementById("resMapsLink");
    const resInfoLink = document.getElementById("resInfoLink");

    // --- State ---
    let userPreferences = {};
    let matchedTrip = null;

    // --- Theme Toggle ---
    themeToggleBtn.addEventListener("click", () => {
        document.body.classList.toggle("dark-mode");
        const icon = themeToggleBtn.querySelector("i");
        if (document.body.classList.contains("dark-mode")) {
            icon.classList.remove("fa-moon");
            icon.classList.add("fa-sun");
        } else {
            icon.classList.remove("fa-sun");
            icon.classList.add("fa-moon");
        }
    });

    // --- Filter Form Logic ---
    const filterGroups = document.querySelectorAll(".chips-container");
    
    // Add click event to chips for UI toggle
    filterGroups.forEach(group => {
        const chips = group.querySelectorAll(".chip");
        chips.forEach(chip => {
            chip.addEventListener("click", () => {
                // Deselect others in group
                chips.forEach(c => c.classList.remove("selected"));
                // Select clicked
                chip.classList.add("selected");
                const radio = chip.querySelector("input[type='radio']");
                radio.checked = true;
                
                checkFormValidity();
            });
        });
    });

    function checkFormValidity() {
        const formData = new FormData(filterForm);
        const requiredFields = ["region", "routeType", "food", "difficulty", "style", "duration"];
        let isValid = true;
        
        requiredFields.forEach(field => {
            if (!formData.has(field)) {
                isValid = false;
            }
        });
        
        readyBtn.disabled = !isValid;
        if (isValid) {
            formError.classList.add("hidden");
        }
    }

    readyBtn.addEventListener("click", () => {
        const formData = new FormData(filterForm);
        userPreferences = {
            region: formData.get("region"),
            routeType: formData.get("routeType"),
            food: formData.get("food") === "כן",
            difficulty: formData.get("difficulty"),
            style: formData.get("style"),
            duration: formData.get("duration")
        };
        
        // Transition to Roulette
        filterSection.classList.add("hidden");
        resultSection.classList.add("hidden");
        rouletteSection.classList.remove("hidden");
        
        // Reset spin button state
        spinBtn.disabled = false;
        spinBtn.innerHTML = '<i class="fas fa-sync-alt"></i> סובבו עכשיו!';
        
        // Pre-fill roulette with random dummy data to look ready
        fillWheel(wheelRegionSlots, ["צפון", "מרכז", "דרום", "ירושלים"]);
        fillWheel(wheelStyleSlots, ["רומנטי", "טבע", "מים", "קולינרי", "שקיעה"]);
        fillWheel(wheelTypeSlots, ["מעגלי", "קווי", "קצר", "ארוך"]);
    });

    // --- Matching Logic ---
    function findBestMatch() {
        // 1. Strict filter by Region (user specifically chose this)
        let pool = trips.filter(t => t.region === userPreferences.region);
        
        // Fallback: If no region matches (shouldn't happen with our dataset, but just in case), use all
        if (pool.length === 0) pool = trips;

        // 2. Score the remaining trips based on other preferences
        pool.forEach(t => {
            t.score = 0;
            
            // Route type match
            if (t.routeType === userPreferences.routeType || t.lengthCategory === userPreferences.routeType) t.score += 2;
            
            // Difficulty match
            if (t.difficulty === userPreferences.difficulty) t.score += 2;
            
            // Duration match
            if (t.durationCategory === userPreferences.duration) t.score += 2;
            
            // Style match (array)
            if (t.style.includes(userPreferences.style)) t.score += 3; // High weight for style
            
            // Food match
            if (userPreferences.food && t.hasFoodOption) t.score += 2;
            if (!userPreferences.food && !t.hasFoodOption) t.score += 1; 
        });

        // Sort by score descending
        pool.sort((a, b) => b.score - a.score);
        
        // Get the top matches (e.g. top 3) and pick one randomly so it's not always the exact same trip for the same inputs
        const topScore = pool[0].score;
        const bestCandidates = pool.filter(t => t.score >= topScore - 2); // anything within 2 points of max
        
        // Select random from best candidates
        const randomIndex = Math.floor(Math.random() * bestCandidates.length);
        return bestCandidates[randomIndex];
    }

    // --- Roulette Logic ---
    spinBtn.addEventListener("click", () => {
        spinBtn.disabled = true;
        spinBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> מסובב...';
        
        matchedTrip = findBestMatch();
        
        // Setup Wheels for spinning
        // We will generate 20 items per wheel. The last item is the target.
        const spinDurationMs = 3000;
        
        setupSpin(wheelRegionSlots, matchedTrip.region);
        
        // For style, pick the primary matched style or the first one
        const targetStyle = matchedTrip.style.includes(userPreferences.style) ? userPreferences.style : matchedTrip.style[0];
        setupSpin(wheelStyleSlots, targetStyle);
        
        setupSpin(wheelTypeSlots, matchedTrip.routeType);

        // Execute Spin
        setTimeout(() => {
            // Spin animation takes 3 seconds via CSS transition defined in JS
            wheelRegionSlots.style.transform = `translateY(-${(20-1) * 60}px)`; // 60px is slot height
            wheelStyleSlots.style.transform = `translateY(-${(20-1) * 60}px)`;
            wheelTypeSlots.style.transform = `translateY(-${(20-1) * 60}px)`;
            
            // Wait for 3 seconds animation to finish
            setTimeout(() => {
                showResult();
            }, spinDurationMs + 200); // 200ms buffer
        }, 100);
    });

    function fillWheel(container, dummyData) {
        container.innerHTML = "";
        container.style.transition = "none";
        container.style.transform = "translateY(0px)";
        
        // Fill initial static items
        for(let i=0; i<3; i++) {
            const div = document.createElement("div");
            div.className = "slot-item";
            div.textContent = dummyData[Math.floor(Math.random() * dummyData.length)];
            container.appendChild(div);
        }
    }

    function setupSpin(container, targetText) {
        container.innerHTML = "";
        container.style.transition = "none";
        container.style.transform = "translateY(0px)";
        
        const dummyOptions = ["צפון", "דרום", "מרכז", "רומנטי", "טבע", "מים", "מעגלי", "קווי", "קצר"];
        
        // Create 20 items. 
        for (let i = 0; i < 19; i++) {
            const div = document.createElement("div");
            div.className = "slot-item";
            div.textContent = dummyOptions[Math.floor(Math.random() * dummyOptions.length)];
            container.appendChild(div);
        }
        
        // Target item (the 20th item)
        const targetDiv = document.createElement("div");
        targetDiv.className = "slot-item";
        targetDiv.textContent = targetText;
        targetDiv.style.color = "var(--primary-color)";
        targetDiv.style.fontWeight = "bold";
        container.appendChild(targetDiv);
        
        // Force reflow
        void container.offsetWidth;
        
        // Apply transition
        container.style.transition = "transform 3s cubic-bezier(0.15, 0.85, 0.15, 1)";
    }

    // --- Result UI ---
    function showResult() {
        rouletteSection.classList.add("hidden");
        resultSection.classList.remove("hidden");
        
        // Populate Data
        resName.textContent = matchedTrip.name;
        resShortDesc.textContent = matchedTrip.shortDescription;
        
        // "Why it fits" logic
        resWhyFit.textContent = `המסלול הזה נבחר במיוחד עבורכם כי חיפשתם טיול באזור ה${userPreferences.region}, באווירת ${userPreferences.style}. הוא מציע רמת קושי ${matchedTrip.difficulty} שמתאימה לזמן שהגדרתם (${userPreferences.duration}). ${userPreferences.food ? "ויש כאן יופי של אופציות לאוכל באזור!" : ""}`;
        
        resRegion.textContent = matchedTrip.region;
        resLength.textContent = matchedTrip.lengthCategory === "קצר" ? "מסלול קצר" : "מסלול ארוך";
        resDuration.textContent = matchedTrip.durationText;
        resDifficulty.textContent = matchedTrip.difficulty;
        resRouteType.textContent = matchedTrip.routeType;
        resDriveDist.textContent = matchedTrip.driveDistance;
        
        resElevation.textContent = matchedTrip.elevationDetail;
        resStart.textContent = matchedTrip.startPoint;
        resEnd.textContent = matchedTrip.endPoint;
        
        // Highlights List
        resHighlights.innerHTML = "";
        matchedTrip.highlights.forEach(h => {
            const li = document.createElement("li");
            li.textContent = h;
            resHighlights.appendChild(li);
        });
        
        resFood.textContent = matchedTrip.foodRecommendations;
        resBringSeason.textContent = `${matchedTrip.whatToBring} | עונות מומלצות: ${matchedTrip.seasonSuitability}`;
        
        resMapsLink.onclick = () => window.open(matchedTrip.mapsLink, '_blank');
        resInfoLink.onclick = () => window.open(matchedTrip.infoLink, '_blank');
    }

    // --- Navigation Actions ---
    spinAgainBtn.addEventListener("click", () => {
        resultSection.classList.add("hidden");
        rouletteSection.classList.remove("hidden");
        spinBtn.disabled = false;
        spinBtn.innerHTML = '<i class="fas fa-sync-alt"></i> סובבו עכשיו!';
        
        // Reset wheels visually
        fillWheel(wheelRegionSlots, ["צפון", "מרכז", "דרום", "ירושלים"]);
        fillWheel(wheelStyleSlots, ["רומנטי", "טבע", "מים", "קולינרי", "שקיעה"]);
        fillWheel(wheelTypeSlots, ["מעגלי", "קווי", "קצר", "ארוך"]);
    });

    editFiltersBtn.addEventListener("click", () => {
        resultSection.classList.add("hidden");
        filterSection.classList.remove("hidden");
    });

});
