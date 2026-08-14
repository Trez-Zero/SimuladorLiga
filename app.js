document.addEventListener('DOMContentLoaded', () => {
    const numTeamsInput = document.getElementById('num-teams');
    const teamInputsContainer = document.getElementById('team-inputs-container');
    const startBtn = document.getElementById('start-btn');
    const configSection = document.getElementById('config-section');
    const tournamentSection = document.getElementById('tournament-section');
    const currentPhaseTitle = document.getElementById('current-phase-title');
    const simulateMatchdayBtn = document.getElementById('simulate-matchday-btn');
    const standingsTableBody = document.querySelector('#standings-table tbody');
    const matchesContainer = document.getElementById('matches-container');
    const matchdayTitle = document.getElementById('matchday-title');
    const playoffsContainer = document.getElementById('playoffs-container');
    const bracketGrid = document.getElementById('bracket-grid');
    
    const customAlert = document.getElementById('custom-alert');
    const alertMessage = document.getElementById('alert-message');
    const alertOkBtn = document.getElementById('alert-ok-btn');

    let teams = [];
    let schedule = [];
    let currentMatchday = 0;
    let tournamentPhase = 'regular'; 
    let playoffRounds = [];
    let currentPlayoffStage = 0; 

    generateTeamInputs();
    numTeamsInput.addEventListener('input', generateTeamInputs);

    function generateTeamInputs() {
        const num = parseInt(numTeamsInput.value);
        teamInputsContainer.innerHTML = '';
        for (let i = 1; i <= num; i++) {
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'team-name-input';
            input.placeholder = `Equipo ${i}`;
            input.value = `Equipo ${i}`;
            teamInputsContainer.appendChild(input);
        }
    }

    startBtn.addEventListener('click', () => {
        const num = parseInt(numTeamsInput.value);
        if (num < 4 || num > 20) {
            showAlert("La cantidad de equipos debe estar entre 4 y 20.");
            return;
        }

        const inputElements = document.querySelectorAll('.team-name-input');
        teams = [];
        
        inputElements.forEach((input, index) => {
            teams.push({
                id: index,
                name: input.value.trim() || `Equipo ${index + 1}`,
                power: Math.floor(Math.random() * 40) + 60,
                pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, dg: 0, pts: 0
            });
        });

        schedule = generateRoundRobinSchedule(teams);
        currentMatchday = 0;
        tournamentPhase = 'regular';

        configSection.classList.add('hidden');
        tournamentSection.classList.remove('hidden');
        playoffsContainer.classList.add('hidden');
        document.querySelector('.standings-wrapper').classList.remove('hidden');
        document.querySelector('.matches-wrapper').classList.remove('hidden');
        simulateMatchdayBtn.classList.remove('hidden');
        simulateMatchdayBtn.textContent = "Simular Jornada";
        currentPhaseTitle.textContent = "Fase Regular";

        updateStandingsUI();
        loadMatchdayUI();
    });

    function generateRoundRobinSchedule(teamsList) {
        let list = [...teamsList];
        if (list.length % 2 !== 0) {
            list.push({ id: -1, name: 'DESCANSO' });
        }

        const totalTeams = list.length;
        const rounds = totalTeams - 1;
        let firstLeg = [];

        for (let r = 0; r < rounds; r++) {
            let matchdayMatches = [];
            for (let i = 0; i < totalTeams / 2; i++) {
                const home = list[i];
                const away = list[totalTeams - 1 - i];
                if (home.id !== -1 && away.id !== -1) {
                    matchdayMatches.push({ home, away, played: false, hGoals: 0, aGoals: 0 });
                }
            }
            firstLeg.push(matchdayMatches);
            list.splice(1, 0, list.pop());
        }

        let secondLeg = firstLeg.map(round => {
            return round.map(match => ({
                home: match.away,
                away: match.home,
                played: false,
                hGoals: 0,
                aGoals: 0
            }));
        });

        return [...firstLeg, ...secondLeg];
    }

    simulateMatchdayBtn.addEventListener('click', () => {
        if (tournamentPhase === 'regular') {
            if (currentMatchday < schedule.length) {
                schedule[currentMatchday].forEach(match => {
                    if (!match.played) {
                        const res = simulateMatch(match.home, match.away);
                        match.hGoals = res.hGoals;
                        match.aGoals = res.aGoals;
                        match.played = true;
                        updateStatsAfterMatch(match.home, match.away, res.hGoals, res.aGoals);
                    }
                });

                updateStandingsUI();
                loadMatchdayUI();
                currentMatchday++;
            }

            if (currentMatchday >= schedule.length) {
                simulateMatchdayBtn.textContent = "Iniciar Playoffs";
                tournamentPhase = 'ready-for-playoffs';
            }
        } else if (tournamentPhase === 'ready-for-playoffs') {
            startPlayoffs();
        } else if (tournamentPhase === 'playoffs') {
            handlePlayoffProgression();
        }
    });

    function simulateMatch(homeTeam, awayTeam) {
        const homeAdvantage = 5;
        const diff = (homeTeam.power + homeAdvantage) - awayTeam.power;
        let hGoals = Math.max(0, Math.floor(Math.random() * 3) + Math.floor(diff / 15));
        let aGoals = Math.max(0, Math.floor(Math.random() * 3) - Math.floor(diff / 15));
        if (Math.random() < 0.2) hGoals += Math.floor(Math.random() * 2);
        if (Math.random() < 0.2) aGoals += Math.floor(Math.random() * 2);
        return { hGoals, aGoals };
    }

    function updateStatsAfterMatch(home, away, hG, aG) {
        home.pj++; away.pj++;
        home.gf += hG; home.gc += aG; home.dg = home.gf - home.gc;
        away.gf += aG; away.gc += hG; away.dg = away.gf - away.gc;

        if (hG > aG) {
            home.g++; home.pts += 3;
            away.p++;
        } else if (hG < aG) {
            away.g++; away.pts += 3;
            home.p++;
        } else {
            home.e++; home.pts += 1;
            away.e++; away.pts += 1;
        }
    }

    function updateStandingsUI() {
        standingsTableBody.innerHTML = '';
        let sortedTeams = [...teams].sort((a, b) => b.pts - a.pts || b.dg - a.dg || b.gf - a.gf);

        sortedTeams.forEach((team, index) => {
            const tr = document.createElement('tr');
            if (index < 8 && teams.length >= 8) {
                tr.style.background = 'rgba(16, 185, 129, 0.08)';
            }
            tr.innerHTML = `
                <td>${index + 1}</td>
                <td><strong>${team.name}</strong></td>
                <td>${team.pj}</td>
                <td>${team.g}</td>
                <td>${team.e}</td>
                <td>${team.p}</td>
                <td>${team.gf}</td>
                <td>${team.gc}</td>
                <td>${team.dg > 0 ? '+' + team.dg : team.dg}</td>
                <td><strong>${team.pts}</strong></td>
            `;
            standingsTableBody.appendChild(tr);
        });
    }

    function loadMatchdayUI() {
        if (currentMatchday >= schedule.length) return;
        matchdayTitle.textContent = `Jornada ${currentMatchday + 1} de ${schedule.length}`;
        matchesContainer.innerHTML = '';

        schedule[currentMatchday].forEach(match => {
            const card = document.createElement('div');
            card.className = 'match-card';
            card.innerHTML = `
                <span class="match-teams">${match.home.name} vs ${match.away.name}</span>
                <span class="match-score">${match.played ? `${match.hGoals} - ${match.aGoals}` : 'vs'}</span>
            `;
            matchesContainer.appendChild(card);
        });
    }

    function startPlayoffs() {
        if (teams.length < 8) {
            showAlert("Se necesitan al menos 8 equipos para los playoffs.");
            return;
        }

        tournamentPhase = 'playoffs';
        currentPhaseTitle.textContent = "Cuartos de Final (Ida y Vuelta)";
        simulateMatchdayBtn.textContent = "Simular Cuartos de Final";
        
        document.querySelector('.standings-wrapper').classList.add('hidden');
        document.querySelector('.matches-wrapper').classList.add('hidden');
        playoffsContainer.classList.remove('hidden');

        let sortedTeams = [...teams].sort((a, b) => b.pts - a.pts || b.dg - a.dg);
        let top8 = sortedTeams.slice(0, 8);

        playoffRounds = [
            {
                stageName: "Cuartos de Final",
                matches: [
                    { home: top8[0], away: top8[7], hLegG: 0, aLegG: 0, hRetG: 0, aRetG: 0, playedLeg: false, playedRet: false, winner: null },
                    { home: top8[3], away: top8[4], hLegG: 0, aLegG: 0, hRetG: 0, aRetG: 0, playedLeg: false, playedRet: false, winner: null },
                    { home: top8[1], away: top8[6], hLegG: 0, aLegG: 0, hRetG: 0, aRetG: 0, playedLeg: false, playedRet: false, winner: null },
                    { home: top8[2], away: top8[5], hLegG: 0, aLegG: 0, hRetG: 0, aRetG: 0, playedLeg: false, playedRet: false, winner: null }
                ]
            }
        ];

        currentPlayoffStage = 1; 
        renderBracket();
    }

    function handlePlayoffProgression() {
        if (currentPlayoffStage === 1) {
            playoffRounds[0].matches.forEach(m => {
                const res1 = simulateMatch(m.home, m.away);
                m.hLegG = res1.hGoals;
                m.aLegG = res1.aGoals;
                m.playedLeg = true;

                const res2 = simulateMatch(m.away, m.home);
                m.hRetG = res2.aGoals;
                m.aRetG = res2.hGoals;
                m.playedRet = true;

                const aggHome = m.hLegG + m.hRetG;
                const aggAway = m.aLegG + m.aRetG;
                m.winner = aggHome > aggAway ? m.home : (aggAway > aggHome ? m.away : (Math.random() < 0.5 ? m.home : m.away));
            });

            const winnersQF = playoffRounds[0].matches.map(m => m.winner);
            playoffRounds.push({
                stageName: "Semifinales",
                matches: [
                    { home: winnersQF[0], away: winnersQF[1], hLegG: 0, aLegG: 0, hRetG: 0, aRetG: 0, playedLeg: false, playedRet: false, winner: null },
                    { home: winnersQF[2], away: winnersQF[3], hLegG: 0, aLegG: 0, hRetG: 0, aRetG: 0, playedLeg: false, playedRet: false, winner: null }
                ]
            });
            currentPlayoffStage = 2;
            currentPhaseTitle.textContent = "Semifinales (Ida y Vuelta)";
            simulateMatchdayBtn.textContent = "Simular Semifinales";
        } else if (currentPlayoffStage === 2) {
            playoffRounds[1].matches.forEach(m => {
                const res1 = simulateMatch(m.home, m.away);
                m.hLegG = res1.hGoals;
                m.aLegG = res1.aGoals;
                m.playedLeg = true;

                const res2 = simulateMatch(m.away, m.home);
                m.hRetG = res2.aGoals;
                m.aRetG = res2.hGoals;
                m.playedRet = true;

                const aggHome = m.hLegG + m.hRetG;
                const aggAway = m.aLegG + m.aRetG;
                m.winner = aggHome > aggAway ? m.home : (aggAway > aggHome ? m.away : (Math.random() < 0.5 ? m.home : m.away));
            });

            const winnersSF = playoffRounds[1].matches.map(m => m.winner);
            playoffRounds.push({
                stageName: "Gran Final",
                matches: [
                    { home: winnersSF[0], away: winnersSF[1], hLegG: 0, aLegG: 0, hRetG: 0, aRetG: 0, playedLeg: false, playedRet: false, winner: null }
                ]
            });
            currentPlayoffStage = 3;
            currentPhaseTitle.textContent = "Gran Final";
            simulateMatchdayBtn.textContent = "¡Jugar Gran Final!";
        } else if (currentPlayoffStage === 3) {
            const finalMatch = playoffRounds[2].matches[0];
            const res1 = simulateMatch(finalMatch.home, finalMatch.away);
            finalMatch.hLegG = res1.hGoals;
            finalMatch.aLegG = res1.aGoals;
            finalMatch.playedLeg = true;

            const res2 = simulateMatch(finalMatch.away, finalMatch.home);
            finalMatch.hRetG = res2.aGoals;
            finalMatch.aRetG = res2.hGoals;
            finalMatch.playedRet = true;

            const aggHome = finalMatch.hLegG + finalMatch.hRetG;
            const aggAway = finalMatch.aLegG + finalMatch.aRetG;
            let champion = aggHome > aggAway ? finalMatch.home : (aggAway > aggHome ? finalMatch.away : (Math.random() < 0.5 ? finalMatch.home : finalMatch.away));
            finalMatch.winner = champion;

            currentPlayoffStage = 4;
            simulateMatchdayBtn.classList.add('hidden');
            currentPhaseTitle.textContent = `🏆 ¡CAMPEÓN DE LA LIGA: ${champion.name}! 🏆`;
        }

        renderBracket();
    }

    function renderBracket() {
        bracketGrid.innerHTML = '';
        playoffRounds.forEach(round => {
            const roundDiv = document.createElement('div');
            roundDiv.className = 'bracket-round';
            roundDiv.innerHTML = `<h4>${round.stageName}</h4>`;

            round.matches.forEach(m => {
                const matchBox = document.createElement('div');
                matchBox.className = 'bracket-match';
                matchBox.innerHTML = `
                    <div class="bracket-team ${m.winner === m.home ? 'winner-team' : ''}">
                        <span>${m.home.name}</span>
                        <span>${m.playedLeg ? `${m.hLegG}${m.playedRet ? ' (' + (m.hLegG + m.hRetG) + ')' : ''}` : ''}</span>
                    </div>
                    <div class="bracket-team ${m.winner === m.away ? 'winner-team' : ''}">
                        <span>${m.away.name}</span>
                        <span>${m.playedLeg ? `${m.aLegG}${m.playedRet ? ' (' + (m.aLegG + m.aRetG) + ')' : ''}` : ''}</span>
                    </div>
                `;
                roundDiv.appendChild(matchBox);
            });
            bracketGrid.appendChild(roundDiv);
        });
    }

    function showAlert(msg) {
        alertMessage.textContent = msg;
        customAlert.classList.remove('hidden');
    }

    alertOkBtn.addEventListener('click', () => {
        customAlert.classList.add('hidden');
    });
});