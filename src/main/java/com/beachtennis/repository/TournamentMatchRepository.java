package com.beachtennis.repository;

import com.beachtennis.model.TournamentMatch;
import com.beachtennis.model.Tournament;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface TournamentMatchRepository extends JpaRepository<TournamentMatch, Long> {
    List<TournamentMatch> findByTournament(Tournament tournament);
}
