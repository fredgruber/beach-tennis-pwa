package com.beachtennis.repository;

import com.beachtennis.model.Team;
import com.beachtennis.model.Tournament;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface TeamRepository extends JpaRepository<Team, Long> {
    List<Team> findByTournament(Tournament tournament);
}
