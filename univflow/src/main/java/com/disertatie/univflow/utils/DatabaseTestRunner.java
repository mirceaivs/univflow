package com.disertatie.univflow.utils;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;

@Component
public class DatabaseTestRunner implements CommandLineRunner {

    private final JdbcTemplate jdbc;

    @Autowired
    public DatabaseTestRunner(DataSource dataSource) {
        
        this.jdbc = new JdbcTemplate(dataSource);
    }

    @Override
    public void run(String... args) {
        System.out.println("--------------------------------------------------");
        System.out.println("VERIFICARE CONEXIUNE LA BAZA DE DATE POSTGRESQL");
        System.out.println("--------------------------------------------------");

        try {
            
            Integer result = jdbc.queryForObject("SELECT 1 + 1", Integer.class);
            System.out.println("CONEXIUNE DB: SUCCES! (1+1=" + result + ")");
        } catch (Exception e) {
            System.err.println("CONEXIUNE DB: EROARE -> " + e.getMessage());
        }

        System.out.println("--------------------------------------------------");
    }
}