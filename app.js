let teams = [];
let schedule = [];
let currentRoundIndex = 0;
let isSeasonFinished = false;

let playoffStage = "Cuartos de Final"; 
let playoffMatches = [];
let semifinalsMatches = [];
let finalMatch = [];
let champion = null;

class Team {
    constructor(name) {
        this.name = name;
        this.power = (Math.random() * 0.8) + 0.4; 
        this.pts = 0; this.pj = 0; this.pg = 0; this.pe = 0; this.pp = 0;
        this.gf = 0; this.gc = 0;
        this.h2h = {}; 
    }
    get dif() { return this.gf - this.gc; }
}

function generateTeamInputs() {
    let count = document.getElementById("team-count").value;
    if(count < 4 || count > 20) return alert("Debe ser entre 4 y 20 equipos dawg.");
    let html = '';
    for(let i=0; i<count; i++) {
        html += `<input type="text" id="team-name-${i}" placeholder="Nombre del Bro ${i+1}">`;
    }
    html += `<br><button onclick="startLeague()">Empezar Liga</button>`;
    document.getElementById("team-inputs").innerHTML = html;
}

function startLeague() {
    let customLeagueName = document.getElementById("league-name").value;
    if(customLeagueName.trim() !== "") {
        document.getElementById("main-title").innerText = `🏆 ${customLeagueName} 🏆`;
    }

    let count = document.getElementById("team-count").value;
    for(let i=0; i<count; i++) {
        let name = document.getElementById(`team-name-${i}`).value || `Equipo ${i+1}`;
        teams.push(new Team(name));
    }
    
    teams.forEach(t1 => {
        teams.forEach(t2 => { if(t1 !== t2) t1.h2h[t2.name] = { pts: 0, dif: 0 }; });
    });

    generateSchedule();
    
    document.getElementById("setup-screen").classList.add("hidden");
    document.getElementById("league-screen").classList.remove("hidden");
    updateTable();
}

function generateSchedule() {
    let dummyTeams = [...teams];
    if (dummyTeams.length % 2 !== 0) dummyTeams.push(new Team("Descansa")); 
    let totalRounds = dummyTeams.length - 1;
    let halfSize = dummyTeams.length / 2;

    let primeraVuelta = [];
    for (let round = 0; round < totalRounds; round++) {
        let matches = [];
        for (let i = 0; i < halfSize; i++) {
            if (dummyTeams[i].name !== "Descansa" && dummyTeams[dummyTeams.length - 1 - i].name !== "Descansa") {
                matches.push({ home: dummyTeams[i], away: dummyTeams[dummyTeams.length - 1 - i] });
            }
        }
        primeraVuelta.push(matches);
        dummyTeams.splice(1, 0, dummyTeams.pop()); 
    }

    let segundaVuelta = primeraVuelta.map(round => 
        round.map(match => ({ home: match.away, away: match.home }))
    );

    schedule = primeraVuelta.concat(segundaVuelta);
    document.getElementById("round-display").innerText = `Jornada: 0 / ${schedule.length}`;
}

function simMatch(home, away) {
    let homeAdvantage = 1.1; 
    let homeGoals = 0;
    let awayGoals = 0;
    
    for(let i=0; i<5; i++) {
        if(Math.random() < (home.power * homeAdvantage) / 2) homeGoals++;
        if(Math.random() < away.power / 2) awayGoals++;
    }
    return { hg: homeGoals, ag: awayGoals };
}

function simulateNextRound() {
    if (isSeasonFinished) return;
    
    let currentMatches = schedule[currentRoundIndex];
    let resultsHTML = "";

    currentMatches.forEach(match => {
        let res = simMatch(match.home, match.away);
        
        match.home.pj++; match.away.pj++;
        match.home.gf += res.hg; match.home.gc += res.ag;
        match.away.gf += res.ag; match.away.gc += res.hg;

        if (res.hg > res.ag) { 
            match.home.pts += 3; match.home.pg++; match.away.pp++;
            match.home.h2h[match.away.name].pts += 3;
            match.home.h2h[match.away.name].dif += (res.hg - res.ag);
            match.away.h2h[match.home.name].dif -= (res.hg - res.ag);
        } else if (res.hg < res.ag) { 
            match.away.pts += 3; match.away.pg++; match.home.pp++;
            match.away.h2h[match.home.name].pts += 3;
            match.away.h2h[match.home.name].dif += (res.ag - res.hg);
            match.home.h2h[match.away.name].dif -= (res.ag - res.hg);
        } else { 
            match.home.pts++; match.away.pts++;
            match.home.pe++; match.away.pe++;
            match.home.h2h[match.away.name].pts += 1;
            match.away.h2h[match.home.name].pts += 1;
        }

        resultsHTML += `<li>${match.home.name} <strong>${res.hg} - ${res.ag}</strong> ${match.away.name}</li>`;
    });

    document.getElementById("results-list").innerHTML = resultsHTML;
    currentRoundIndex++;
    document.getElementById("round-display").innerText = `Jornada: ${currentRoundIndex} / ${schedule.length}`;
    
    updateTable();

    if (currentRoundIndex >= schedule.length) {
        isSeasonFinished = true;
        alert("¡Temporada Regular Terminada! Pasando a la pestaña de Playoffs.");
        openPlayoffsScreen();
    }
}

function simulateFullSeason() {
    while(!isSeasonFinished) {
        simulateNextRound();
    }
}

function updateTable() {
    teams.sort((a, b) => {
        if (b.pts !== a.pts) return b.pts - a.pts;
        let h2hA = a.h2h[b.name];
        let h2hB = b.h2h[a.name];
        if (h2hA.pts !== h2hB.pts) return h2hA.pts - h2hB.pts;
        if (h2hA.dif !== h2hB.dif) return h2hA.dif - h2hB.dif;
        return b.dif - a.dif; 
    });

    let tbody = document.getElementById("standings-body");
    tbody.innerHTML = "";
    teams.forEach((t, index) => {
        let tr = document.createElement("tr");
        if(index < 8) tr.style.backgroundColor = "rgba(0, 255, 128, 0.2)"; 
        tr.innerHTML = `
            <td>${index + 1}</td><td>${t.name}</td><td><strong>${t.pts}</strong></td>
            <td>${t.pj}</td><td>${t.pg}</td><td>${t.pe}</td><td>${t.pp}</td>
            <td>${t.gf}</td><td>${t.gc}</td><td>${t.dif}</td>
        `;
        tbody.appendChild(tr);
    });
}

// --- ZONA DE PLAYOFFS Y PESTAÑA APARTE ---
function openPlayoffsScreen() {
    document.getElementById("league-screen").classList.add("hidden");
    document.getElementById("playoffs-screen").classList.remove("hidden");
    
    let top = teams.slice(0, 8); 
    if(top.length < 8) {
        document.getElementById("bracket-container").innerHTML = "<p>No hay suficientes equipos para playoffs.</p>";
        return;
    }
    
    // Inicializar Cuartos de Final
    playoffMatches = [
        { team1: top[0], team2: top[7], score1Ida: '-', score2Ida: '-', score1Vuelta: '-', score2Vuelta: '-', winner: null, played: false },
        { team1: top[3], team2: top[4], score1Ida: '-', score2Ida: '-', score1Vuelta: '-', score2Vuelta: '-', winner: null, played: false },
        { team1: top[1], team2: top[6], score1Ida: '-', score2Ida: '-', score1Vuelta: '-', score2Vuelta: '-', winner: null, played: false },
        { team1: top[2], team2: top[5], score1Ida: '-', score2Ida: '-', score1Vuelta: '-', score2Vuelta: '-', winner: null, played: false }
    ];
    
    semifinalsMatches = [
        { team1: {name: 'Por definir'}, team2: {name: 'Por definir'}, score1Ida: '-', score2Ida: '-', score1Vuelta: '-', score2Vuelta: '-', winner: null, played: false },
        { team1: {name: 'Por definir'}, team2: {name: 'Por definir'}, score1Ida: '-', score2Ida: '-', score1Vuelta: '-', score2Vuelta: '-', winner: null, played: false }
    ];

    finalMatch = [
        { team1: {name: 'Por definir'}, team2: {name: 'Por definir'}, score1Ida: '-', score2Ida: '-', score1Vuelta: '-', score2Vuelta: '-', winner: null, played: false }
    ];

    renderBracket();
}

function simulatePlayoffRound() {
    if (playoffStage === "Cuartos de Final") {
        let nextStageTeams = [];
        playoffMatches.forEach(m => {
            let ida = simMatch(m.team1, m.team2);
            let vuelta = simMatch(m.team2, m.team1);
            m.score1Ida = ida.hg; m.score2Ida = ida.ag;
            m.score1Vuelta = vuelta.ag; m.score2Vuelta = vuelta.hg;
            m.played = true;

            let g1 = ida.hg + vuelta.ag;
            let g2 = ida.ag + vuelta.hg;

            if (g1 > g2) m.winner = m.team1;
            else if (g2 > g1) m.winner = m.team2;
            else {
                let p1 = 0, p2 = 0;
                while(p1 === p2) { p1 = Math.floor(Math.random()*5)+1; p2 = Math.floor(Math.random()*5)+1; }
                m.winner = p1 > p2 ? m.team1 : m.team2;
            }
            nextStageTeams.push(m.winner);
        });

        // Configurar Semifinales
        semifinalsMatches[0].team1 = nextStageTeams[0];
        semifinalsMatches[0].team2 = nextStageTeams[1];
        semifinalsMatches[1].team1 = nextStageTeams[2];
        semifinalsMatches[1].team2 = nextStageTeams[3];

        playoffStage = "Semifinales";
    } 
    else if (playoffStage === "Semifinales") {
        let nextStageTeams = [];
        semifinalsMatches.forEach(m => {
            let ida = simMatch(m.team1, m.team2);
            let vuelta = simMatch(m.team2, m.team1);
            m.score1Ida = ida.hg; m.score2Ida = ida.ag;
            m.score1Vuelta = vuelta.ag; m.score2Vuelta = vuelta.hg;
            m.played = true;

            let g1 = ida.hg + vuelta.ag;
            let g2 = ida.ag + vuelta.hg;

            if (g1 > g2) m.winner = m.team1;
            else if (g2 > g1) m.winner = m.team2;
            else {
                let p1 = 0, p2 = 0;
                while(p1 === p2) { p1 = Math.floor(Math.random()*5)+1; p2 = Math.floor(Math.random()*5)+1; }
                m.winner = p1 > p2 ? m.team1 : m.team2;
            }
            nextStageTeams.push(m.winner);
        });

        // Configurar Final
        finalMatch[0].team1 = nextStageTeams[0];
        finalMatch[0].team2 = nextStageTeams[1];

        playoffStage = "Gran Final";
    }
    else if (playoffStage === "Gran Final") {
        let m = finalMatch[0];
        let ida = simMatch(m.team1, m.team2);
        let vuelta = simMatch(m.team2, m.team1);
        m.score1Ida = ida.hg; m.score2Ida = ida.ag;
        m.score1Vuelta = vuelta.ag; m.score2Vuelta = vuelta.hg;
        m.played = true;

        let g1 = ida.hg + vuelta.ag;
        let g2 = ida.ag + vuelta.hg;

        if (g1 > g2) m.winner = m.team1;
        else if (g2 > g1) m.winner = m.team2;
        else {
            let p1 = 0, p2 = 0;
            while(p1 === p2) { p1 = Math.floor(Math.random()*5)+1; p2 = Math.floor(Math.random()*5)+1; }
            m.winner = p1 > p2 ? m.team1 : m.team2;
        }
        champion = m.winner;
        playoffStage = "Campeón Definido";
        document.getElementById("btn-playoffs").classList.add("hidden");
        document.getElementById("bracket-results").innerHTML = `<h2>🏆 ¡${champion.name.toUpperCase()} ES EL CAMPEÓN DE LA LIGA! 🏆</h2>`;
    }

    renderBracket();
}

function renderBracket() {
    let html = `
        <div class="bracket-round">
            <h4>Cuartos de Final</h4>
            ${playoffMatches.map(m => createMatchCard(m)).join('')}
        </div>
        <div class="bracket-round">
            <h4>Semifinales</h4>
            ${semifinalsMatches.map(m => createMatchCard(m)).join('')}
        </div>
        <div class="bracket-round">
            <h4>Gran Final</h4>
            ${finalMatch.map(m => createMatchCard(m)).join('')}
        </div>
    `;
    document.getElementById("bracket-container").innerHTML = html;
}

function createMatchCard(m) {
    let t1Class = m.winner === m.team1 ? 'team-row winner' : 'team-row';
    let t2Class = m.winner === m.team2 ? 'team-row winner' : 'team-row';
    return `
        <div class="playoff-match-card">
            <div class="${t1Class}">
                <span>${m.team1.name}</span>
                <span>Ida: ${m.score1Ida} | Vuelta: ${m.score1Vuelta}</span>
            </div>
            <div class="${t2Class}">
                <span>${m.team2.name}</span>
                <span>Ida: ${m.score2Ida} | Vuelta: ${m.score2Vuelta}</span>
            </div>
        </div>
    `;
}