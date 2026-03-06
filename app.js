/**
 * Clima+ Dashboard Business Logic
 * Modern Performance Visualization Engine
 */

document.addEventListener('DOMContentLoaded', () => {
    // SECURITY CHECK: Redirect to login if not authenticated
    if (sessionStorage.getItem('clima_auth') !== 'true') {
        window.location.href = 'login.html';
        return;
    }

    const CSV_PATH = 'FEEDBACK - PESQUISA DE CLIMA (1).CSV';
    const loader = document.getElementById('loading');

    // Application State
    const state = {
        rawData: [],
        directorates: {},
        selectedDir: 'all',
        selectedCategory: 'all', // "all", "3+", "3", "2", "1", "0"
        charts: {
            comparison: null,
            gap: null,
            bridge: null
        }
    };

    // UI Bindings
    const dirFilter = document.getElementById('diretoria-filter');
    const categoryFilter = document.getElementById('category-filter'); // New
    const tableBody = document.getElementById('table-body');
    const searchInput = document.getElementById('tableSearch');
    const lastUpdatedLabel = document.getElementById('last-updated-text');
    const logoutBtn = document.getElementById('logoutBtn');

    // 1. Initialize Application
    Chart.register(ChartDataLabels);
    init();

    async function init() {
        showLoader(true);
        try {
            const data = await fetchAndParseCSV();
            processData(data);
            setupFilters();
            setupSearch();
            updateDashboard();

            // Set timestamp
            const now = new Date();
            if (lastUpdatedLabel) {
                lastUpdatedLabel.innerText = `Sincronizado ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
            }
        } catch (error) {
            console.error('Falha na inicialização:', error);
            alert('Erro ao carregar os dados climáticos.');
        } finally {
            showLoader(false);
        }
    }

    // 2. Data Fetching
    async function fetchAndParseCSV() {
        const response = await fetch(CSV_PATH);
        const buffer = await response.arrayBuffer();
        const decoder = new TextDecoder('windows-1252');
        const csvText = decoder.decode(buffer);

        return new Promise((resolve, reject) => {
            Papa.parse(csvText, {
                delimiter: ";",
                header: false,
                skipEmptyLines: true,
                complete: (results) => resolve(results.data),
                error: (err) => reject(err)
            });
        });
    }

    function processData(rows) {
        let currentDir = "Outros";
        // Initialize state
        state.directorates = {
            "Outros": { totals: { lg: 0, gptw: 0, gap: 0 }, units: [] }
        };

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const areaName = row[0] ? row[0].trim() : '';
            if (!areaName || areaName === 'ÁREAS' || areaName === 'REAS' || areaName.includes('MAIS DE TRÊS')) continue;

            // Map data
            const dataMap = {
                '3+': { lg: parseNum(row[1]), gptw: parseNum(row[2]), gap: parsePct(row[3]) },
                '3': { lg: parseNum(row[4]), gptw: parseNum(row[5]), gap: parsePct(row[6]) },
                '2': { lg: parseNum(row[7]), gptw: parseNum(row[8]), gap: parsePct(row[9]) },
                '1': { lg: parseNum(row[10]), gptw: parseNum(row[11]), gap: parsePct(row[12]) },
                '0': { lg: 0, gptw: parseNum(row[13]) + parseNum(row[14]), gap: 0 }
            };

            const lg = dataMap['3+'].lg + dataMap['3'].lg + dataMap['2'].lg + dataMap['1'].lg;
            const gptw = dataMap['3+'].gptw + dataMap['3'].gptw + dataMap['2'].gptw + dataMap['1'].gptw + dataMap['0'].gptw;
            const gap = gptw > 0 ? ((lg - gptw) / gptw * 100).toFixed(1) : 0;

            const record = {
                id: i,
                area: areaName,
                lg: lg,
                gptw: gptw,
                gap: parseFloat(gap),
                categories: dataMap,
                isDirectorate: areaName.startsWith('DIRETORIA')
            };

            if (record.isDirectorate) {
                currentDir = areaName;
                state.directorates[currentDir] = {
                    area: areaName,
                    lg: record.lg,
                    gptw: record.gptw,
                    gap: record.gap,
                    categories: dataMap,
                    units: []
                };
            } else {
                state.directorates[currentDir].units.push(record);
                state.rawData.push(record);
            }
        }
    }

    function updateDashboard() {
        const category = state.selectedCategory;
        const isGlobal = state.selectedDir === 'all';
        let sourceData, totalLG, totalGPTW;

        if (isGlobal) {
            // View of all Directorates
            sourceData = Object.values(state.directorates).filter(d => d.area);
            totalLG = sourceData.reduce((s, d) => s + d.lg, 0);
            totalGPTW = sourceData.reduce((s, d) => s + d.gptw, 0);
        } else {
            // View of Management units within a Directorate
            const dir = state.directorates[state.selectedDir];
            sourceData = dir.units;
            totalLG = dir.lg;
            totalGPTW = dir.gptw;
        }

        // Map data to current category context
        const data = sourceData.map(r => {
            const vals = category === 'all' ? r : r.categories[category];
            return {
                area: r.area,
                lg: vals.lg,
                gptw: vals.gptw,
                gap: vals.gap
            };
        });

        // Global Gap (KPIs)
        const globalGap = totalGPTW > 0 ? ((totalLG - totalGPTW) / totalGPTW * 100).toFixed(1) : 0;

        animateCounter('kpi-lg', totalLG);
        animateCounter('kpi-gptw', totalGPTW);
        animateCounter('kpi-gap', globalGap);

        renderTable(data);
        renderCharts(data);
    }


    // 4. UI Rendering
    function renderTable(data) {
        const filterVal = searchInput.value.toLowerCase();
        tableBody.innerHTML = '';

        const filtered = data.filter(r => r.area.toLowerCase().includes(filterVal));

        if (filtered.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="4" class="text-center" style="padding: 2rem; color: #94A3B8;">Nenhum resultado encontrado</td></tr>`;
            return;
        }

        filtered.forEach(r => {
            const tr = document.createElement('tr');

            const gapBadge = r.gap > 50 ? 'badge-high' : (r.gap > 20 ? 'badge-mid' : 'badge-low');

            tr.innerHTML = `
                <td style="font-weight: 600;">${r.area}</td>
                <td class="text-right">${r.lg.toLocaleString()}</td>
                <td class="text-right">${r.gptw.toLocaleString()}</td>
                <td class="text-center">
                    <span class="badge-gap ${gapBadge}">${r.gap}%</span>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    }

    // Register custom plugin for GAP Brackets
    Chart.register({
        id: 'gapBrackets',
        afterDatasetsDraw(chart) {
            if (chart.canvas.id !== 'comparisonChart') return;
            const { ctx, data } = chart;
            const lgMeta = chart.getDatasetMeta(0);
            const gptwMeta = chart.getDatasetMeta(1);
            const gapValues = data.gapValues || [];

            ctx.save();
            lgMeta.data.forEach((bar, i) => {
                if (!gptwMeta.data[i] || gapValues[i] === undefined) return;

                const x1 = bar.x;
                const x2 = gptwMeta.data[i].x;
                // Sobe a linha do GAP para dar espaço aos números no topo
                const y = Math.min(bar.y, gptwMeta.data[i].y) - 28;

                // Draw black connector line
                ctx.beginPath();
                ctx.strokeStyle = '#263238'; // Deep Gunmetal
                ctx.lineWidth = 2.5;
                ctx.moveTo(x1, y);
                ctx.lineTo(x2, y);
                ctx.stroke();

                // Draw markers (squares)
                const s = 7;
                ctx.fillStyle = '#263238';
                ctx.fillRect(x1 - s / 2, y - s / 2, s, s);
                ctx.fillRect(x2 - s / 2, y - s / 2, s, s);

                // Draw GAP text in the middle
                ctx.fillStyle = '#D32F2F'; // Strong Red
                ctx.font = 'bold 13px Outfit';
                ctx.textAlign = 'center';
                ctx.fillText(gapValues[i] + '%', (x1 + x2) / 2, y - 10);
            });
            ctx.restore();
        }
    });

    function renderCharts(data) {
        // Prepare Top 10 to keep it clear and high-impact
        const sortedData = [...data].sort((a, b) => b.lg - a.lg).slice(0, 10);

        // Multi-line labels logic
        const labels = sortedData.map(r => {
            let name = r.area.replace(/GERENCIA |SUPERVISAO |GESTAO |DIRETORIA /g, '').trim();
            const words = name.split(' ');
            if (words.length >= 3) {
                const mid = Math.ceil(words.length / 2);
                return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
            }
            return name;
        });

        // Ajuste para escala logarítmica: valores 0 viram 1 para aparecerem na base
        const lgSet = sortedData.map(r => r.lg <= 0 ? 1 : r.lg);
        const gptwSet = sortedData.map(r => r.gptw <= 0 ? 1 : r.gptw);
        const gapSet = sortedData.map(r => r.gap);

        // Chart 1: Comparison + GAP Brackets (Principal)
        if (state.charts.comparison) state.charts.comparison.destroy();
        const ctx1 = document.getElementById('comparisonChart').getContext('2d');

        state.charts.comparison = new Chart(ctx1, {
            type: 'bar',
            data: {
                labels: labels,
                gapValues: gapSet, // Custom property for plugin
                datasets: [
                    {
                        label: 'LG',
                        data: lgSet,
                        backgroundColor: '#30515F',
                        borderRadius: 8,
                        barPercentage: 0.85,
                        categoryPercentage: 0.7,
                        datalabels: { align: 'center', color: '#FFF', font: { size: 12, weight: 'bold' } }
                    },
                    {
                        label: 'GPTW',
                        data: gptwSet,
                        backgroundColor: '#7CB342',
                        borderRadius: 8,
                        barPercentage: 0.85,
                        categoryPercentage: 0.7,
                        datalabels: { align: 'center', color: '#FFF', font: { size: 12, weight: 'bold' } }
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: { padding: { top: 70, bottom: 40 } },
                plugins: {
                    legend: { position: 'top', labels: { usePointStyle: true, font: { family: 'Outfit', weight: '700', size: 13 } } },
                    tooltip: { mode: 'index', intersect: false },
                    datalabels: {
                        display: true,
                        anchor: 'end',
                        align: 'top',
                        offset: 2,
                        color: 'var(--primary)',
                        formatter: (v) => v < 1 ? '0' : Math.round(v).toLocaleString(),
                        font: { family: 'Outfit', weight: '900', size: 13 }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { font: { family: 'Outfit', weight: '700', size: 11 }, autoSkip: false }
                    },
                    y: {
                        type: 'logarithmic',
                        display: false,
                        min: 1,
                        suggestedMax: Math.max(...lgSet, ...gptwSet) * 10
                    }
                }
            }
        });

        // Chart 2: GAP Ranking
        const sortedGap = [...data].sort((a, b) => b.gap - a.gap).slice(0, 10);
        const gapLabels = sortedGap.map(r => {
            let name = r.area.replace(/GERENCIA |SUPERVISAO |GESTAO |DIRETORIA /g, '').trim();
            const words = name.split(' ');

            // If name is long, split it
            if (name.length > 12 || words.length >= 2) {
                const mid = Math.ceil(words.length / 2);
                return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
            }
            return name;
        });

        if (state.charts.gap) state.charts.gap.destroy();
        const ctx2 = document.getElementById('gapRankingChart').getContext('2d');

        state.charts.gap = new Chart(ctx2, {
            type: 'bar',
            data: {
                labels: gapLabels,
                datasets: [{
                    label: 'GAP (%)',
                    data: sortedGap.map(r => r.gap),
                    backgroundColor: (ctx) => {
                        const val = ctx.raw;
                        return val > 50 ? '#D32F2F' : (val > 20 ? '#EF7D00' : '#7CB342');
                    },
                    borderRadius: 6,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: { padding: { top: 30, bottom: 40 } },
                plugins: {
                    legend: { display: false },
                    datalabels: {
                        anchor: 'end',
                        align: 'top',
                        formatter: (v) => v + '%',
                        font: { family: 'Outfit', weight: '800', size: 12 }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: {
                            font: { family: 'Outfit', weight: '700', size: 10 },
                            maxRotation: 0,
                            minRotation: 0,
                            autoSkip: false
                        }
                    },
                    y: { display: false }
                }
            }
        });

        // --- NEW: WATERFALL (BRIDGE) CHART (EXECUTIVE SUMMARY) ---
        const totalLG = data.reduce((s, r) => s + r.lg, 0);
        const totalGPTW = data.reduce((s, r) => s + r.gptw, 0);

        if (state.charts.bridge) state.charts.bridge.destroy();
        const ctxBridge = document.getElementById('waterfallChart').getContext('2d');

        state.charts.bridge = new Chart(ctxBridge, {
            type: 'bar',
            data: {
                labels: ['LG', 'DIVERGÊNCIA (GAP)', 'GPTW'],
                datasets: [{
                    label: 'Volume Total',
                    data: [
                        [0, totalLG],                   // Start
                        [totalLG, totalGPTW],           // Bridge
                        [0, totalGPTW]                  // End
                    ],
                    backgroundColor: [
                        '#30515F', // LG Brand Color
                        '#EF7D00', // GAP Brand Alert Color
                        '#7CB342'  // GPTW Brand Color
                    ],
                    borderRadius: 8,
                    borderSkipped: false,
                    barPercentage: 0.5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: { padding: { top: 40, bottom: 20, left: 100, right: 100 } },
                plugins: {
                    legend: { display: false },
                    datalabels: {
                        anchor: 'end',
                        align: 'top',
                        formatter: (val, ctx) => {
                            if (ctx.dataIndex === 1) {
                                const diff = val[1] - val[0];
                                return `${diff.toLocaleString()} pt`;
                            }
                            const v = Array.isArray(val) ? val[1] : val;
                            return v.toLocaleString();
                        },
                        font: { family: 'Outfit', weight: '800', size: 15 },
                        color: (ctx) => ctx.dataIndex === 1 ? '#FF7043' : '#30515F'
                    }
                },
                scales: {
                    x: { grid: { display: false }, ticks: { font: { family: 'Outfit', weight: '800', size: 12 } } },
                    y: { display: false }
                }
            }
        });
    }

    // 6. Global Functions (Exposed to window)
    window.downloadChart = (chartId, filename) => {
        const canvas = document.getElementById(chartId);
        const link = document.createElement('a');
        link.download = `${filename}.png`;

        // Fill background with white before download (Canvas is transparent by default)
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.fillStyle = '#FFFFFF';
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        tempCtx.drawImage(canvas, 0, 0);

        link.href = tempCanvas.toDataURL('image/png');
        link.click();
    };

    // 5. Helpers & Animation
    function setupFilters() {
        const sorted = Object.keys(state.directorates).sort();
        sorted.forEach(dir => {
            const opt = document.createElement('option');
            opt.value = dir;
            opt.innerText = dir;
            dirFilter.appendChild(opt);
        });

        dirFilter.addEventListener('change', (e) => {
            state.selectedDir = e.target.value;
            updateDashboard();
        });

        categoryFilter.addEventListener('change', (e) => {
            state.selectedCategory = e.target.value;
            updateDashboard();
        });

        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                sessionStorage.removeItem('clima_auth');
                window.location.reload();
            });
        }
    }

    function setupSearch() {
        searchInput.addEventListener('input', () => {
            renderTable(getVisibleData());
        });
    }

    function animateCounter(id, target) {
        const el = document.getElementById(id);
        if (!el) return;

        let start = 0;
        const duration = 800;
        const stepTime = 20;
        const increment = target / (duration / stepTime);

        const timer = setInterval(() => {
            start += increment;
            if (start >= target) {
                el.innerText = target.toLocaleString();
                clearInterval(timer);
            } else {
                el.innerText = Math.floor(start).toLocaleString();
            }
        }, stepTime);
    }

    function showLoader(show) {
        if (show) loader.classList.add('active');
        else loader.classList.remove('active');
    }

    function parseNum(v) {
        if (!v || v === 'N/A') return 0;
        return parseInt(v.toString().replace(/[^\d]/g, '')) || 0;
    }

    function parsePct(v) {
        if (!v || v === 'N/A') return 0;
        return parseFloat(v.toString().replace('%', '').replace(',', '.')) || 0;
    }
});
