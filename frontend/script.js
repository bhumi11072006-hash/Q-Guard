
/* =========================================================
   Q-GUARD
   QUANTUM ERROR DETECTION & RECOVERY SIMULATOR
   COMPLETE JAVASCRIPT
========================================================= */


/* =========================================================
   1. CONFIGURATION
========================================================= */

const API_BASE_URL = "http://localhost:3000/api";

const API_ENDPOINTS = {
    health: "/health",
    dashboard: "/dashboard",
    simulations: "/simulations",
    analytics: "/analytics",
    simulate: "/simulate"
};

const $ = (id) => document.getElementById(id);

let dashboardChart = null;
let fidelityChart = null;
let noiseChart = null;

let simulationHistory = [];
let latestSimulation = null;


/* =========================================================
   2. HELPER FUNCTIONS
========================================================= */

function formatPercentage(value) {

    if (value === null || value === undefined || value === "") {
        return "--";
    }

    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "--";
    }

    // Supports both decimal values and percentage values.
    const percentage = Math.abs(number) <= 1
        ? number * 100
        : number;

    return percentage.toFixed(2) + "%";
}


function getNumber(...values) {

    for (const value of values) {

        if (
            value !== undefined &&
            value !== null &&
            value !== "" &&
            Number.isFinite(Number(value))
        ) {
            return Number(value);
        }
    }

    return null;
}


function extractData(response) {

    if (response && response.data !== undefined) {
        return response.data;
    }

    return response;
}


function extractArray(response) {

    const data = extractData(response);

    if (Array.isArray(data)) {
        return data;
    }

    if (data && Array.isArray(data.simulations)) {
        return data.simulations;
    }

    if (data && Array.isArray(data.history)) {
        return data.history;
    }

    if (data && Array.isArray(data.results)) {
        return data.results;
    }

    return [];
}


function escapeHTML(value) {

    return String(value ?? "").replace(/[&<>"']/g, (character) => {

        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        };

        return entities[character];
    });
}


function formatDate(value) {

    if (!value) {
        return "--";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return String(value);
    }

    return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}


function showNotification(message, type = "success") {

    const notification = $("notification");
    const notificationText = $("notificationText");
    const notificationIcon = $("notificationIcon");

    if (!notification || !notificationText) {
        console.log(message);
        return;
    }

    notificationText.textContent = message;

    if (notificationIcon) {
        notificationIcon.textContent =
            type === "error" ? "!" :
            type === "warning" ? "⚠" : "✓";
    }

    notification.classList.remove("show");

    void notification.offsetWidth;

    notification.classList.add("show");

    clearTimeout(showNotification.timer);

    showNotification.timer = setTimeout(() => {
        notification.classList.remove("show");
    }, 3500);
}


/* =========================================================
   3. API REQUEST HANDLER
========================================================= */

async function apiRequest(endpoint, options = {}) {

    const controller = new AbortController();

    const timeout = setTimeout(() => {
        controller.abort();
    }, 30000);

    try {

        const response = await fetch(
            API_BASE_URL + endpoint,
            {
                ...options,
                signal: controller.signal,
                headers: {
                    "Content-Type": "application/json",
                    ...(options.headers || {})
                }
            }
        );

        const contentType = response.headers.get("content-type") || "";

        let result;

        if (contentType.includes("application/json")) {
            result = await response.json();
        } else {
            result = await response.text();
        }

        if (!response.ok) {

            const message =
                typeof result === "object"
                    ? result.message || result.error || "Request failed"
                    : result || "Request failed";

            throw new Error(message);
        }

        return result;

    } catch (error) {

        if (error.name === "AbortError") {
            throw new Error("Request timed out. Please try again.");
        }

        if (error instanceof TypeError) {
            throw new Error(
                "Cannot connect to the backend. Please check whether the server is running."
            );
        }

        throw error;

    } finally {
        clearTimeout(timeout);
    }
}


/* =========================================================
   4. CONNECTION STATUS
========================================================= */

function updateConnectionStatus(connected, message = "") {

    const connectionText = $("connectionText");
    const systemStatus = $("systemStatus");
    const systemDescription = $("systemDescription");

    const indicators = document.querySelectorAll(".status-indicator");

    indicators.forEach(indicator => {

        indicator.style.background = connected
            ? "var(--green)"
            : "var(--red)";

        indicator.style.boxShadow = connected
            ? "0 0 10px var(--green)"
            : "0 0 10px var(--red)";
    });

    if (connectionText) {
        connectionText.textContent = connected
            ? "Backend Online"
            : "Backend Offline";
    }

    if (systemStatus) {
        systemStatus.textContent = connected
            ? "Backend Connected"
            : "Connection Failed";
    }

    if (systemDescription) {
        systemDescription.textContent = connected
            ? "API server is responding"
            : message || "Start the backend server";
    }
}


async function checkBackendConnection() {

    try {

        await apiRequest(API_ENDPOINTS.health);

        updateConnectionStatus(true);

        return true;

    } catch (error) {

        updateConnectionStatus(false, error.message);

        return false;
    }
}


/* =========================================================
   5. PAGE NAVIGATION
========================================================= */

const pageNames = {
    dashboard: "Dashboard",
    simulator: "Simulator",
    analytics: "Analytics",
    history: "Simulation History",
    learning: "Learning Center",
    about: "About Q-Guard"
};


function navigateToPage(pageName) {

    const target = $(pageName);

    if (!target) {
        return;
    }

    document.querySelectorAll(".page-section").forEach(section => {
        section.classList.remove("active");
    });

    target.classList.add("active");

    document.querySelectorAll(".nav-link").forEach(link => {

        link.classList.toggle(
            "active",
            link.dataset.page === pageName
        );
    });

    const currentPageName = $("currentPageName");

    if (currentPageName) {
        currentPageName.textContent =
            pageNames[pageName] || pageName;
    }

    history.replaceState(null, "", "#" + pageName);

    closeSidebar();

    if (pageName === "analytics") {
        loadAnalytics();
    }

    if (pageName === "history") {
        loadHistory();
    }

    if (pageName === "dashboard") {
        loadDashboard();
    }

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


function initializeNavigation() {

    document.querySelectorAll("[data-page]").forEach(link => {

        link.addEventListener("click", event => {

            event.preventDefault();

            navigateToPage(link.dataset.page);
        });
    });

    document.querySelectorAll("[data-navigate]").forEach(button => {

        button.addEventListener("click", () => {

            navigateToPage(button.dataset.navigate);
        });
    });

    const initialPage = location.hash.replace("#", "");

    navigateToPage(
        pageNames[initialPage] ? initialPage : "dashboard"
    );
}


/* =========================================================
   6. MOBILE SIDEBAR
========================================================= */

function openSidebar() {

    const sidebar = $("sidebar");

    if (sidebar) {
        sidebar.classList.add("open");
    }
}


function closeSidebar() {

    const sidebar = $("sidebar");

    if (sidebar) {
        sidebar.classList.remove("open");
    }
}


function initializeSidebar() {

    $("menuToggle")?.addEventListener("click", openSidebar);

    $("sidebarClose")?.addEventListener("click", closeSidebar);

    document.addEventListener("click", event => {

        const sidebar = $("sidebar");
        const menuToggle = $("menuToggle");

        if (
            sidebar &&
            sidebar.classList.contains("open") &&
            !sidebar.contains(event.target) &&
            !menuToggle?.contains(event.target)
        ) {
            closeSidebar();
        }
    });
}


/* =========================================================
   7. DARK / LIGHT THEME
========================================================= */

function initializeTheme() {

    const themeToggle = $("themeToggle");

    const savedTheme = localStorage.getItem("qguard-theme");

    if (savedTheme === "light") {
        document.body.classList.add("light-theme");
    }

    updateThemeButton();

    themeToggle?.addEventListener("click", () => {

        document.body.classList.toggle("light-theme");

        const currentTheme = document.body.classList.contains("light-theme")
            ? "light"
            : "dark";

        localStorage.setItem("qguard-theme", currentTheme);

        updateThemeButton();

        showNotification(
            currentTheme === "light"
                ? "Light theme enabled"
                : "Dark theme enabled"
        );
    });
}


function updateThemeButton() {

    const button = $("themeToggle");

    if (!button) return;

    button.textContent = document.body.classList.contains("light-theme")
        ? "☀"
        : "☾";
}


/* =========================================================
   8. SIMULATOR FORM CONTROLS
========================================================= */

function initializeSimulatorControls() {

    const probability = $("probability");
    const probabilityValue = $("probabilityValue");

    probability?.addEventListener("input", () => {

        if (probabilityValue) {

            probabilityValue.textContent =
                (Number(probability.value) * 100).toFixed(0) + "%";
        }
    });


    const errorCode = $("errorCode");
    const targetQubit = $("targetQubit");

    errorCode?.addEventListener("change", () => {

        updateTargetQubitOptions();
    });

    updateTargetQubitOptions();


    $("resetSimulation")?.addEventListener("click", () => {

        setTimeout(() => {

            if (probabilityValue) {
                probabilityValue.textContent = "10%";
            }

            clearSimulationResults();

            const message = $("simulationMessage");

            if (message) {
                message.textContent = "";
                message.className = "message";
            }

            showNotification("Configuration reset");

        }, 0);
    });
}


function updateTargetQubitOptions() {

    const errorCode = $("errorCode");
    const targetQubit = $("targetQubit");
    const qubitHelp = $("qubitHelp");

    if (!errorCode || !targetQubit) return;

    const selectedCode = errorCode.value;

    const numberOfQubits = selectedCode === "shor" ? 9 : 3;

    const previousValue = Number(targetQubit.value);

    targetQubit.innerHTML = "";

    for (let i = 0; i < numberOfQubits; i++) {

        const option = document.createElement("option");

        option.value = String(i);
        option.textContent = "Qubit " + i;

        targetQubit.appendChild(option);
    }

    targetQubit.value = String(
        Math.min(previousValue, numberOfQubits - 1)
    );

    if (qubitHelp) {
        qubitHelp.textContent =
            `Select a target qubit from 0 to ${numberOfQubits - 1}.`;
    }
}


/* =========================================================
   9. CLEAR SIMULATION RESULTS
========================================================= */

function clearSimulationResults() {

    latestSimulation = null;

    const placeholder = $("resultPlaceholder");
    const content = $("resultContent");
    const status = $("resultStatus");

    if (placeholder) {
        placeholder.hidden = false;
    }

    if (content) {
        content.hidden = true;
    }

    if (status) {
        status.textContent = "WAITING";
        status.className = "result-status";
    }
}


/* =========================================================
   10. RUN QUANTUM SIMULATION
========================================================= */

async function runSimulation(event) {

    event.preventDefault();

    const runButton = $("runSimulation");
    const message = $("simulationMessage");

    const errorCode = $("errorCode")?.value;
    const noiseType = $("noiseType")?.value;
    const probability = Number($("probability")?.value);
    const shots = Number($("shots")?.value);
    const targetQubit = Number($("targetQubit")?.value);

    if (
        !errorCode ||
        !noiseType ||
        !Number.isFinite(probability) ||
        !Number.isInteger(shots) ||
        !Number.isInteger(targetQubit)
    ) {
        showSimulationMessage("Please check all configuration values.", "error");
        return;
    }

    if (probability < 0 || probability > 0.5) {
        showSimulationMessage("Error probability must be between 0 and 50%.", "error");
        return;
    }

    const payload = {
        codeType: errorCode,
        noiseType: noiseType,
        errorProbability: probability,
        shots: shots,
        targetQubit: targetQubit
    };

    runButton.disabled = true;
    runButton.textContent = "⏳ Running Simulation...";

    showSimulationMessage(
        "Sending experiment to the quantum simulation engine...",
        "success"
    );

    const resultStatus = $("resultStatus");

    if (resultStatus) {
        resultStatus.textContent = "RUNNING";
        resultStatus.className = "result-status";
    }

    try {

        const response = await apiRequest(
            API_ENDPOINTS.simulate,
            {
                method: "POST",
                body: JSON.stringify(payload)
            }
        );

        const result = extractData(response);

        latestSimulation =
            result.simulation ||
            result.result ||
            result;

        displaySimulationResults(latestSimulation);

        showSimulationMessage(
            "Simulation completed successfully.",
            "success"
        );

        showNotification("Quantum simulation completed");

        await Promise.all([
            loadDashboard(),
            loadHistory(),
            loadAnalytics()
        ]);

    } catch (error) {

        console.error("Simulation error:", error);

        if (resultStatus) {
            resultStatus.textContent = "FAILED";
            resultStatus.className = "result-status error";
        }

        showSimulationMessage(error.message, "error");

        showNotification(error.message, "error");

    } finally {

        runButton.disabled = false;
        runButton.innerHTML = "<span>⚛</span> Run Simulation";
    }
}


function showSimulationMessage(text, type) {

    const message = $("simulationMessage");

    if (!message) return;

    message.textContent = text;
    message.className = "message " + type;
}


/* =========================================================
   11. DISPLAY SIMULATION RESULTS
========================================================= */

function displaySimulationResults(result) {

    if (!result || typeof result !== "object") {
        throw new Error("The simulation engine returned an invalid result.");
    }

    const fidelity = getNumber(
        result.fidelity,
        result.metrics?.fidelity
    );

    const recovery = getNumber(
        result.recovery_success_rate,
        result.recoverySuccessRate,
        result.metrics?.recovery_success_rate
    );

    const logicalError = getNumber(
        result.logical_error_rate,
        result.logicalErrorRate,
        result.metrics?.logical_error_rate
    );

    if (fidelity === null || recovery === null || logicalError === null) {
        throw new Error(
            "Simulation response is missing required metrics. Check the Python engine response."
        );
    }

    const placeholder = $("resultPlaceholder");
    const content = $("resultContent");
    const status = $("resultStatus");

    if (placeholder) {
        placeholder.hidden = true;
    }

    if (content) {
        content.hidden = false;
    }

    $("resultFidelity").textContent = formatPercentage(fidelity);

    $("resultRecovery").textContent = formatPercentage(recovery);

    $("resultError").textContent = formatPercentage(logicalError);

    const syndrome = result.syndrome_summary ??
        result.syndromeSummary ??
        result.syndrome ??
        "No syndrome information returned.";

    $("syndromeSummary").textContent =
        typeof syndrome === "string"
            ? syndrome
            : JSON.stringify(syndrome, null, 2);

    $("interpretation").textContent =
        result.interpretation ||
        "Simulation completed. Review the metrics and syndrome information above.";

    if (status) {
        status.textContent = "COMPLETED";
        status.className = "result-status success";
    }
}


/* =========================================================
   12. DASHBOARD
========================================================= */

async function loadDashboard() {

    try {

        const response = await apiRequest(API_ENDPOINTS.dashboard);

        const data = extractData(response);

        updateDashboardStatistics(data);

    } catch (error) {

        console.warn("Dashboard data unavailable:", error.message);
    }

    try {

        const response = await apiRequest(API_ENDPOINTS.simulations);

        simulationHistory = extractArray(response);

        renderRecentActivity(simulationHistory);

        updateDashboardChart(simulationHistory);

    } catch (error) {

        console.warn("Recent activity unavailable:", error.message);
    }
}


function updateDashboardStatistics(data) {

    if (!data || typeof data !== "object") return;

    const total = getNumber(
        data.totalSimulations,
        data.total_simulations,
        data.total
    );

    const fidelity = getNumber(
        data.averageFidelity,
        data.average_fidelity
    );

    const recovery = getNumber(
        data.recoveryRate,
        data.recovery_rate,
        data.averageRecovery,
        data.average_recovery
    );

    const logicalError = getNumber(
        data.logicalErrorRate,
        data.logical_error_rate,
        data.averageLogicalErrorRate,
        data.average_logical_error_rate
    );

    if (total !== null) {
        $("totalSimulations").textContent = total;
    }

    if (fidelity !== null) {
        $("averageFidelity").textContent = formatPercentage(fidelity);
    }

    if (recovery !== null) {
        $("recoveryRate").textContent = formatPercentage(recovery);
    }

    if (logicalError !== null) {
        $("logicalErrorRate").textContent = formatPercentage(logicalError);
    }
}


function renderRecentActivity(items) {

    const container = $("recentActivity");

    if (!container) return;

    if (!items.length) {

        container.innerHTML =
            '<div class="empty-state">No recent simulations yet.</div>';

        return;
    }

    container.innerHTML = items.slice(0, 5).map(item => {

        const code = escapeHTML(item.codeType || item.code_type || item.code || "Quantum Code");

        const date = formatDate(
            item.createdAt || item.created_at || item.date
        );

        const fidelity = formatPercentage(item.fidelity);

        return `
            <div class="activity-item">
                <div class="activity-icon">⚛</div>
                <div class="activity-info">
                    <h4>${code.replaceAll("_", " ")}</h4>
                    <p>${escapeHTML(date)} · Fidelity: ${escapeHTML(fidelity)}</p>
                </div>
            </div>
        `;

    }).join("");
}


/* =========================================================
   13. CHART CONFIGURATION
========================================================= */

function getChartTextColor() {

    return getComputedStyle(document.body)
        .getPropertyValue("--text-secondary")
        .trim() || "#a4afc8";
}


function getChartGridColor() {

    return getComputedStyle(document.body)
        .getPropertyValue("--border")
        .trim() || "rgba(159,177,220,0.12)";
}


function getChartOptions() {

    return {
        responsive: true,
        maintainAspectRatio: false,

        plugins: {
            legend: {
                labels: {
                    color: getChartTextColor(),
                    font: {
                        family: "DM Sans",
                        size: 10
                    }
                }
            }
        },

        scales: {
            x: {
                ticks: {
                    color: getChartTextColor(),
                    font: { size: 10 }
                },
                grid: {
                    color: getChartGridColor()
                }
            },

            y: {
                beginAtZero: true,
                ticks: {
                    color: getChartTextColor(),
                    font: { size: 10 }
                },
                grid: {
                    color: getChartGridColor()
                }
            }
        }
    };
}


function getChartValue(value) {

    const number = Number(value);

    if (!Number.isFinite(number)) return 0;

    return Math.abs(number) <= 1
        ? number * 100
        : number;
}


/* =========================================================
   14. DASHBOARD CHART
========================================================= */

function updateDashboardChart(items) {

    const canvas = $("dashboardChart");

    if (!canvas || typeof Chart === "undefined") return;

    const chartData = items.slice(0, 10).reverse();

    const empty = $("dashboardChartEmpty");

    if (empty) {
        empty.hidden = chartData.length > 0;
    }

    if (dashboardChart) {
        dashboardChart.destroy();
        dashboardChart = null;
    }

    if (!chartData.length) return;

    dashboardChart = new Chart(canvas, {

        type: "line",

        data: {
            labels: chartData.map((item, index) =>
                "Run " + (index + 1)
            ),

            datasets: [
                {
                    label: "Fidelity",
                    data: chartData.map(item =>
                        getChartValue(item.fidelity)
                    ),
                    borderColor: "#9575ff",
                    backgroundColor: "rgba(149,117,255,0.12)",
                    fill: true,
                    tension: 0.35
                },

                {
                    label: "Recovery",
                    data: chartData.map(item =>
                        getChartValue(
                            item.recovery_success_rate ??
                            item.recoverySuccessRate
                        )
                    ),
                    borderColor: "#36d6a0",
                    backgroundColor: "rgba(54,214,160,0.08)",
                    fill: false,
                    tension: 0.35
                }
            ]
        },

        options: getChartOptions()
    });
}


/* =========================================================
   15. ANALYTICS
========================================================= */

async function loadAnalytics() {

    try {

        const [analyticsResponse, simulationsResponse] =
            await Promise.all([
                apiRequest(API_ENDPOINTS.analytics),
                apiRequest(API_ENDPOINTS.simulations)
            ]);

        const analytics = extractData(analyticsResponse);

        const simulations = extractArray(simulationsResponse);

        updateAnalyticsStatistics(analytics);

        updateAnalyticsCharts(simulations);

    } catch (error) {

        console.warn("Analytics unavailable:", error.message);
    }
}


function updateAnalyticsStatistics(data) {

    if (!data || typeof data !== "object") return;

    const total = getNumber(
        data.totalSimulations,
        data.total_simulations,
        data.total
    );

    const fidelity = getNumber(
        data.averageFidelity,
        data.average_fidelity
    );

    const recovery = getNumber(
        data.recoveryRate,
        data.recovery_rate,
        data.averageRecovery,
        data.average_recovery
    );

    const logicalError = getNumber(
        data.logicalErrorRate,
        data.logical_error_rate
    );

    if (total !== null) $("analyticsTotal").textContent = total;

    if (fidelity !== null) {
        $("analyticsFidelity").textContent = formatPercentage(fidelity);
    }

    if (recovery !== null) {
        $("analyticsRecovery").textContent = formatPercentage(recovery);
    }

    if (logicalError !== null) {
        $("analyticsError").textContent = formatPercentage(logicalError);
    }
}


function updateAnalyticsCharts(items) {

    if (typeof Chart === "undefined") return;

    const fidelityCanvas = $("fidelityChart");
    const noiseCanvas = $("noiseChart");

    if (!fidelityCanvas || !noiseCanvas) return;

    if (fidelityChart) {
        fidelityChart.destroy();
    }

    if (noiseChart) {
        noiseChart.destroy();
    }

    fidelityChart = new Chart(fidelityCanvas, {

        type: "line",

        data: {
            labels: items.map((item, index) => "Run " + (index + 1)),

            datasets: [{
                label: "Fidelity",
                data: items.map(item => getChartValue(item.fidelity)),
                borderColor: "#9575ff",
                backgroundColor: "rgba(149,117,255,0.12)",
                fill: true,
                tension: 0.35
            }]
        },

        options: getChartOptions()
    });


    const noiseCounts = {};

    items.forEach(item => {

        const noise =
            item.noiseType ||
            item.noise_type ||
            "Unknown";

        noiseCounts[noise] = (noiseCounts[noise] || 0) + 1;
    });


    noiseChart = new Chart(noiseCanvas, {

        type: "doughnut",

        data: {
            labels: Object.keys(noiseCounts),

            datasets: [{
                data: Object.values(noiseCounts),
                backgroundColor: [
                    "#9575ff",
                    "#55a6ff",
                    "#36d6a0",
                    "#ffb86b"
                ],
                borderWidth: 0
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            plugins: {
                legend: {
                    position: "bottom",
                    labels: {
                        color: getChartTextColor(),
                        padding: 15,
                        font: { size: 10 }
                    }
                }
            }
        }
    });
}


/* =========================================================
   16. SIMULATION HISTORY
========================================================= */

async function loadHistory() {

    try {

        const response = await apiRequest(API_ENDPOINTS.simulations);

        simulationHistory = extractArray(response);

        renderHistory(simulationHistory);

    } catch (error) {

        console.warn("History unavailable:", error.message);
    }
}


function renderHistory(items) {

    const body = $("historyBody");

    if (!body) return;

    if (!items.length) {

        body.innerHTML = `
            <tr>
                <td colspan="7" class="empty-row">
                    No simulations recorded yet.
                </td>
            </tr>
        `;

        return;
    }

    body.innerHTML = items.map((item, index) => {

        const id = escapeHTML(item.id ?? index + 1);

        const code = escapeHTML(
            item.codeType || item.code_type || item.code || "--"
        );

        const noise = escapeHTML(
            item.noiseType || item.noise_type || "--"
        );

        const probability = formatPercentage(
            item.errorProbability ?? item.error_probability
        );

        const shots = escapeHTML(item.shots ?? "--");

        const fidelity = formatPercentage(item.fidelity);

        const date = escapeHTML(formatDate(
            item.createdAt || item.created_at || item.date
        ));

        return `
            <tr>
                <td>#${id}</td>
                <td>${code.replaceAll("_", " ")}</td>
                <td>${noise.replaceAll("_", " ")}</td>
                <td>${escapeHTML(probability)}</td>
                <td>${shots}</td>
                <td>${escapeHTML(fidelity)}</td>
                <td>${date}</td>
            </tr>
        `;

    }).join("");
}


/* =========================================================
   17. CSV EXPORT
========================================================= */

function exportHistoryCSV() {

    if (!simulationHistory.length) {

        showNotification("No simulation history available to export.", "warning");

        return;
    }

    const columns = [
        "ID",
        "Correction Code",
        "Noise Model",
        "Error Probability",
        "Shots",
        "Fidelity",
        "Recovery Success Rate",
        "Logical Error Rate",
        "Date"
    ];

    const rows = simulationHistory.map(item => [

        item.id ?? "",

        item.codeType ?? item.code_type ?? "",

        item.noiseType ?? item.noise_type ?? "",

        item.errorProbability ?? item.error_probability ?? "",

        item.shots ?? "",

        item.fidelity ?? "",

        item.recovery_success_rate ?? item.recoverySuccessRate ?? "",

        item.logical_error_rate ?? item.logicalErrorRate ?? "",

        item.createdAt ?? item.created_at ?? item.date ?? ""

    ]);

    const csv = [
        columns,
        ...rows
    ].map(row => {

        return row.map(value => {

            const safeValue = String(value ?? "")
                .replace(/"/g, '""');

            return `"${safeValue}"`;

        }).join(",");

    }).join("\n");

    const blob = new Blob(
        ["\uFEFF" + csv],
        { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = "Q-Guard-Simulation-History.csv";

    document.body.appendChild(link);

    link.click();

    link.remove();

    URL.revokeObjectURL(url);

    showNotification("CSV exported successfully");
}


/* =========================================================
   18. EVENT LISTENERS
========================================================= */

function initializeEventListeners() {

    $("simulationForm")?.addEventListener(
        "submit",
        runSimulation
    );

    $("exportHistory")?.addEventListener(
        "click",
        exportHistoryCSV
    );

    $("refreshHistory")?.addEventListener(
        "click",
        async () => {

            await loadHistory();

            showNotification("History refreshed");
        }
    );
}


/* =========================================================
   19. REFRESH CHARTS WHEN THEME CHANGES
========================================================= */

function refreshCharts() {

    if (simulationHistory.length) {

        updateDashboardChart(simulationHistory);

        updateAnalyticsCharts(simulationHistory);
    }
}


/* =========================================================
   20. APPLICATION INITIALIZATION
========================================================= */

async function initializeQGuard() {

    console.log("Q-Guard initializing...");

    initializeTheme();

    initializeNavigation();

    initializeSidebar();

    initializeSimulatorControls();

    initializeEventListeners();

    clearSimulationResults();

    const connected = await checkBackendConnection();

    if (connected) {

        console.log("Backend connection successful.");

        await loadDashboard();

    } else {

        console.warn(
            "Backend is offline. Start the Node.js server to enable live data and simulations."
        );
    }

    console.log("Q-Guard frontend initialized.");
}


/* =========================================================
   21. START APPLICATION
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    initializeQGuard();

});


/* =========================================================
   END OF Q-GUARD JAVASCRIPT
========================================================= */
