package com.beachtennis.dto;

import com.beachtennis.model.Team;

public class TeamStanding implements Comparable<TeamStanding> {
    private Team team;
    private int matchesPlayed = 0;
    private int matchesWon = 0;
    private int matchesLost = 0;
    private int gamesWon = 0; // Games Pró
    private int gamesLost = 0; // Games Contra
    private int gamesDifference = 0; // Saldo de Games

    public TeamStanding(Team team) {
        this.team = team;
    }

    public Team getTeam() {
        return team;
    }

    public int getMatchesPlayed() {
        return matchesPlayed;
    }

    public void addMatch(boolean won, int gWon, int gLost) {
        this.matchesPlayed++;
        if (won) {
            this.matchesWon++;
        } else {
            this.matchesLost++;
        }
        this.gamesWon += gWon;
        this.gamesLost += gLost;
        this.gamesDifference = this.gamesWon - this.gamesLost;
    }

    public int getMatchesWon() {
        return matchesWon;
    }

    public int getMatchesLost() {
        return matchesLost;
    }

    public int getGamesWon() {
        return gamesWon;
    }

    public int getGamesLost() {
        return gamesLost;
    }

    public int getGamesDifference() {
        return gamesDifference;
    }

    @Override
    public int compareTo(TeamStanding o) {
        // 1. GP - Games Pró (descendente)
        if (this.gamesWon != o.gamesWon) {
            return Integer.compare(o.gamesWon, this.gamesWon);
        }
        // 2. Vitórias (descendente)
        if (this.matchesWon != o.matchesWon) {
            return Integer.compare(o.matchesWon, this.matchesWon);
        }
        // 3. SG - Saldo de Games (descendente)
        if (this.gamesDifference != o.gamesDifference) {
            return Integer.compare(o.gamesDifference, this.gamesDifference);
        }
        // 4. Nome da Dupla (ascendente)
        return this.team.getName().compareToIgnoreCase(o.team.getName());
    }
}
