document.addEventListener('DOMContentLoaded', () => {
    const numTeamsInput = document.getElementById('num-teams');
    const teamInputsContainer = document.getElementById('team-inputs-container');
    const startBtn = document.getElementById('start-btn');
    const resetTournamentBtn = document.getElementById('reset-tournament-btn');
    const configSection = document.getElementById('config-section');
    const tournamentSection = document.getElementById('tournament-section');
    const simulateMatchdayBtn = document.getElementById('simulate-matchday-btn');
    const simulateAllBtn = document.getElementById('simulate-all-btn');
    const currentPhaseTitle = document.getElementById('current-phase-title');
    const matchdayTitle = document.getElementById('matchday-title');
    const matchesContainer = document.getElementById('matches-container');
    const standingsTableBody = document.querySelector('#standings-table tbody');
    const playoffsContainer = document.getElementById('playoffs-container');
    const playoffsSectionTitle = document.getElementById('playoffs-section-title');
    const bracketGrid = document.getElementById('bracket-grid');
    const historySidebarContainer = document.getElementById('history-sidebar-container');
    
    // Modal elements
    const customAlert = document.getElementById('custom-alert');
    const alertMessage = document.getElementById('alert-message');
    const alertOkBtn = document.getElementById('alert-ok-btn');

    let teams = [];
    let schedule = [];
    let currentMatchday = 0;
    let tournamentStage = 'regular'; // 'regular', 'playoffs', 'finished'
    let playoffRounds = [];
    let currentPlayoffRoundIndex = 0;

    let savedTeamNames = [];

    function showAlert(message) {
        alertMessage.textContent = message;
        customAlert.classList.remove('hidden');
    }

    alertOkBtn.addEventListener('click', () => {
        customAlert.classList.add('hidden');
    });

    function generateTeamInputs(customNames = []) {
        teamInputsContainer.innerHTML = '';
        const count = parseInt(numTeamsInput.value) || 8;

        for (let i = 0; i < count; i++) {
            const div = document.createElement('div');
            const defaultName = customNames[i] || `Equipo ${i + 1}`;
            div.innerHTML = `
                <input type="text" class="team-name-input" placeholder="Equipo ${i + 1}" value="${defaultName}">
            `;
            teamInputsContainer.appendChild(div);
        }
    }

    numTeamsInput.addEventListener('input', () => {
        let val = parseInt(numTeamsInput.value);
        if (val < 4) numTeamsInput.value = 4;
        if (val > 20) numTeamsInput.value = 20;
        generateTeamInputs();
    });

    generateTeamInputs();

    startBtn.addEventListener('click', () => {
        const inputElements = document.querySelectorAll('.team-name-input');
        const namesSet = new Set();
        teams = [];
        savedTeamNames = [];

        inputElements.forEach((input, index) => {
            const name = input.value.trim() || `Equipo ${index + 1}`;
            if (namesSet.has(name)) {
                showAlert(`El nombre "${name}" está repetido. Por favor usa nombres únicos.`);
                throw new Error("Nombres duplicados");
            }
            namesSet.add(name);
            savedTeamNames.push(name);
            teams.push({
                id: index,
                name: name,
                mp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0
            });
        });

        if (teams.length < 4) {
            showAlert("Se requieren al menos 4 equipos.");
            return;
        }

        schedule = generateRoundRobinSchedule(teams);
        currentMatchday = 0;
        tournamentStage = 'regular';

        configSection.classList.add('hidden');
        tournamentSection.classList.remove('hidden');
        playoffsContainer.classList.add('hidden');
        simulateMatchdayBtn.classList.remove('hidden');
        simulateAllBtn.classList.remove('hidden');

        updateStandings();
        renderMatchday();
        updateSidebarHistory();
    });

    resetTournamentBtn.addEventListener('click', () => {
        tournamentSection.classList.add('hidden');
        configSection.classList.remove('hidden');
        playoffsContainer.classList.add('hidden');
        
        numTeamsInput.value = savedTeamNames.length || 8;
        generateTeamInputs(savedTeamNames);
    });

    function generateRoundRobinSchedule(teamsList) {
        let list = [...teamsList];
        if (list.length % 2 !== 0) {
            list.push({ id: -1, name: 'BYE' });
        }

        const totalTeams = list.length;
        const totalRounds = totalTeams - 1;
        const half = totalTeams / 2;
        let matchdaysFirstLeg = [];

        for (let r = 0; r < totalRounds; r++) {
            let matches = [];
            for (let i = 0; i < half; i++) {
                let home = list[i];
                let away = list[totalTeams - 1 - i];

                if (home.id !== -1 && away.id !== -1) {
                    matches.push({ home: home.id, away: away.id, homeScore: null, awayScore: null, played: false });
                }
            }
            matchdaysFirstLeg.push(matches);
            list.splice(1, 0, list.pop());
        }

        let matchdaysSecondLeg = matchdaysFirstLeg.map(matchday => {
            return matchday.map(match => ({
                home: match.away,
                away: match.home,
                homeScore: null,
                awayScore: null,
                played: false
            }));
        });

        return matchdaysFirstLeg.concat(matchdaysSecondLeg);
    }

    function updateStandings() {
        const sortedTeams = [...teams].sort((a, b) => {
            if (b.pts !== a.pts) return b.pts - a.pts;
            if (b.gd !== a.gd) return b.gd - a.gd;
            return b.gf - a.gf;
        });

        standingsTableBody.innerHTML = '';
        sortedTeams.forEach((team, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${index + 1}</td>
                <td>${team.name}</td>
                <td>${team.mp}</td>
                <td>${team.w}</td>
                <td>${team.d}</td>
                <td>${team.l}</td>
                <td>${team.gf}</td>
                <td>${team.ga}</td>
                <td>${team.gd > 0 ? '+' + team.gd : team.gd}</td>
                <td><strong>${team.pts}</strong></td>
            `;
            standingsTableBody.appendChild(tr);
        });
    }

    function renderMatchday() {
        if (currentMatchday < schedule.length) {
            currentPhaseTitle.textContent = "Fase Regular";
            matchdayTitle.textContent = `Jornada ${currentMatchday + 1} de ${schedule.length}`;
            matchesContainer.innerHTML = '';

            schedule[currentMatchday].forEach(match => {
                const homeTeam = teams.find(t => t.id === match.home);
                const awayTeam = teams.find(t => t.id === match.away);

                const card = document.createElement('div');
                card.className = 'match-card';
                
                let scoreText = match.played ? `${match.homeScore} - ${match.awayScore}` : `vs`;

                card.innerHTML = `
                    <div class="match-teams">
                        <div><strong>${homeTeam.name}</strong></div>
                        <div>${awayTeam.name}</div>
                    </div>
                    <div class="match-score">${scoreText}</div>
                `;
                matchesContainer.appendChild(card);
            });
            simulateMatchdayBtn.textContent = "Simular Jornada";
        }
    }

    function processMatchdaySimulation(matchdayIndex) {
        schedule[matchdayIndex].forEach(match => {
            if (!match.played) {
                match.homeScore = Math.floor(Math.random() * 4);
                match.awayScore = Math.floor(Math.random() * 4);
                match.played = true;

                const homeTeam = teams.find(t => t.id === match.home);
                const awayTeam = teams.find(t => t.id === match.away);

                homeTeam.mp++;
                awayTeam.mp++;
                homeTeam.gf += match.homeScore;
                homeTeam.ga += match.awayScore;
                awayTeam.gf += match.awayScore;
                awayTeam.ga += match.homeScore;

                if (match.homeScore > match.awayScore) {
                    homeTeam.w++;
                    homeTeam.pts += 3;
                    awayTeam.l++;
                } else if (match.homeScore < match.awayScore) {
                    awayTeam.w++;
                    awayTeam.pts += 3;
                    homeTeam.l++;
                } else {
                    homeTeam.d++;
                    homeTeam.pts += 1;
                    awayTeam.d++;
                    awayTeam.pts += 1;
                }

                homeTeam.gd = homeTeam.gf - homeTeam.ga;
                awayTeam.gd = awayTeam.gf - awayTeam.ga;
            }
        });
    }

    function updateSidebarHistory() {
        historySidebarContainer.innerHTML = '';
        for (let i = 0; i < currentMatchday; i++) {
            const block = document.createElement('div');
            block.className = 'history-matchday-block';
            
            let html = `<h4>Jornada ${i + 1}</h4>`;
            schedule[i].forEach(match => {
                const homeTeam = teams.find(t => t.id === match.home);
                const awayTeam = teams.find(t => t.id === match.away);
                html += `
                    <div class="history-match-item">
                        <span>${homeTeam.name} vs ${awayTeam.name}</span>
                        <strong>${match.homeScore}-${match.awayScore}</strong>
                    </div>
                `;
            });
            block.innerHTML = html;
            historySidebarContainer.appendChild(block);
        }
    }

    simulateMatchdayBtn.addEventListener('click', () => {
        if (tournamentStage === 'regular') {
            if (currentMatchday < schedule.length) {
                processMatchdaySimulation(currentMatchday);
                currentMatchday++;

                updateStandings();
                renderMatchday();
                updateSidebarHistory();

                if (currentMatchday >= schedule.length) {
                    simulateAllBtn.classList.add('hidden');
                    preparePlayoffs();
                }
            }
        } else if (tournamentStage === 'playoffs') {
            simulatePlayoffRound();
        }
    });

    simulateAllBtn.addEventListener('click', () => {
        if (tournamentStage === 'regular') {
            while (currentMatchday < schedule.length) {
                processMatchdaySimulation(currentMatchday);
                currentMatchday++;
            }
            updateStandings();
            renderMatchday();
            updateSidebarHistory();
            simulateAllBtn.classList.add('hidden');
            preparePlayoffs();
        }
    });

    function preparePlayoffs() {
        tournamentStage = 'playoffs';
        currentPhaseTitle.textContent = "Fase Final (Playoffs)";
        matchdayTitle.textContent = "¡Fase regular finalizada!";
        matchesContainer.innerHTML = '<p style="color: var(--accent);">La fase regular ha concluido. Consulta el cuadro de Playoffs abajo para continuar.</p>';
        simulateMatchdayBtn.textContent = "Simular Ronda de Playoffs";

        const sortedTeams = [...teams].sort((a, b) => {
            if (b.pts !== a.pts) return b.pts - a.pts;
            if (b.gd !== a.gd) return b.gd - a.gd;
            return b.gf - a.gf;
        });

        let playoffTeamCount = sortedTeams.length >= 8 ? 8 : 4;
        let qualifiedTeams = sortedTeams.slice(0, playoffTeamCount);

        playoffRounds = [];

        if (playoffTeamCount === 8) {
            playoffRounds.push({
                name: "Cuartos de Final",
                matches: [
                    { teamA: qualifiedTeams[0], teamB: qualifiedTeams[7], scoreA: null, scoreB: null, winner: null },
                    { teamA: qualifiedTeams[3], teamB: qualifiedTeams[4], scoreA: null, scoreB: null, winner: null },
                    { teamA: qualifiedTeams[1], teamB: qualifiedTeams[6], scoreA: null, scoreB: null, winner: null },
                    { teamA: qualifiedTeams[2], teamB: qualifiedTeams[5], scoreA: null, scoreB: null, winner: null }
                ]
            });
        }

        playoffRounds.push({
            name: "Semifinales",
            matches: playoffTeamCount === 8 ? [] : [
                { teamA: qualifiedTeams[0], teamB: qualifiedTeams[3], scoreA: null, scoreB: null, winner: null },
                { teamA: qualifiedTeams[1], teamB: qualifiedTeams[2], scoreA: null, scoreB: null, winner: null }
            ]
        });

        playoffRounds.push({
            name: "Gran Final",
            matches: [
                { teamA: null, teamB: null, scoreA: null, scoreB: null, winner: null }
            ]
        });

        currentPlayoffRoundIndex = 0;
        playoffsContainer.classList.remove('hidden');
        renderPlayoffBracket();
        
        // Desplazarse suavemente hacia la sección de playoffs
        playoffsContainer.scrollIntoView({ behavior: 'smooth' });
    }

    function simulatePlayoffRound() {
        const currentRound = playoffRounds[currentPlayoffRoundIndex];
        if (!currentRound) return;

        let roundWinners = [];

        currentRound.matches.forEach(match => {
            if (match.teamA && match.teamB && !match.winner) {
                match.scoreA = Math.floor(Math.random() * 4);
                match.scoreB = Math.floor(Math.random() * 4);

                if (match.scoreA === match.scoreB) {
                    match.scoreA += Math.random() > 0.5 ? 1 : 0;
                }

                match.winner = match.scoreA > match.scoreB ? match.teamA : match.teamB;
            }
            if (match.winner) {
                roundWinners.push(match.winner);
            }
        });

        if (currentPlayoffRoundIndex + 1 < playoffRounds.length) {
            const nextRound = playoffRounds[currentPlayoffRoundIndex + 1];
            if (currentPlayoffRoundIndex === 0 && playoffRounds.length === 3) {
                nextRound.matches = [
                    { teamA: playoffRounds[0].matches[0].winner, teamB: playoffRounds[0].matches[1].winner, scoreA: null, scoreB: null, winner: null },
                    { teamA: playoffRounds[0].matches[2].winner, teamB: playoffRounds[0].matches[3].winner, scoreA: null, scoreB: null, winner: null }
                ];
            } else if (nextRound.matches.length === 1 && roundWinners.length >= 2) {
                nextRound.matches[0].teamA = roundWinners[0];
                nextRound.matches[0].teamB = roundWinners[1];
            }
        }

        currentPlayoffRoundIndex++;
        renderPlayoffBracket();

        if (currentPlayoffRoundIndex >= playoffRounds.length) {
            const champion = playoffRounds[playoffRounds.length - 1].matches[0].winner;
            playoffsSectionTitle.textContent = `🏆 ¡El Campeón del Torneo es ${champion.name}! 🏆`;
            simulateMatchdayBtn.classList.add('hidden');
        }
    }

    function renderPlayoffBracket() {
        bracketGrid.innerHTML = '';

        playoffRounds.forEach((round) => {
            const roundDiv = document.createElement('div');
            roundDiv.className = 'bracket-round';
            
            let html = `<h4>${round.name}</h4>`;

            round.matches.forEach(match => {
                const nameA = match.teamA ? match.teamA.name : 'Por definir';
                const nameB = match.teamB ? match.teamB.name : 'Por definir';
                const scoreA = match.scoreA !== null ? match.scoreA : '-';
                const scoreB = match.scoreB !== null ? match.scoreB : '-';

                const isWinnerA = match.winner && match.winner === match.teamA;
                const isWinnerB = match.winner && match.winner === match.teamB;

                html += `
                    <div class="bracket-match">
                        <div class="bracket-team ${isWinnerA ? 'winner-team' : ''}">
                            <span>${nameA}</span>
                            <strong>${scoreA}</strong>
                        </div>
                        <div class="bracket-team ${isWinnerB ? 'winner-team' : ''}">
                            <span>${nameB}</span>
                            <strong>${scoreB}</strong>
                        </div>
                    </div>
                `;
            });

            roundDiv.innerHTML = html;
            bracketGrid.appendChild(roundDiv);
        });
    }
});