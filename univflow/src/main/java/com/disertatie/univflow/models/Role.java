package com.disertatie.univflow.models;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "ROLE")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Role {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_role")
    private Long id;

    @Column(name = "name")
    private String name;
}