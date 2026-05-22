package com.disertatie.univflow.repositories;

import com.disertatie.univflow.models.IdempotencyRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

@Repository
public interface IdempotencyRepository extends JpaRepository<IdempotencyRecord, String> {

    @Modifying
    @Query("DELETE FROM IdempotencyRecord i WHERE i.expiresAt < :now")
    int deleteByExpiresAtBefore(@Param("now") LocalDateTime now);
}