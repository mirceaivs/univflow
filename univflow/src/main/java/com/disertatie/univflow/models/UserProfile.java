package com.disertatie.univflow.models;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "USERPROFILE")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UserProfile {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_profile")
    private Long id;

    @OneToOne
    @JoinColumn(name = "user_id")
    private AppUser user;

    private String lastName;
    private String firstName;
    @Column(columnDefinition = "TEXT")
    private String avatarUrl;

    
    public String getAvatarUrl() {
        if (avatarUrl == null || avatarUrl.trim().isEmpty()) {
            String initials = "";
            if (firstName != null && !firstName.isEmpty()) initials += firstName.charAt(0);
            if (lastName != null && !lastName.isEmpty()) initials += lastName.charAt(0);
            if (initials.isEmpty()) initials = "U";

            return "https://ui-avatars.com/api/?name=" + initials + "&background=random&color=fff";
        }
        return avatarUrl;
    }

    @PrePersist
    @PreUpdate
    private void normalizeNames() {
        this.firstName = capitalize(this.firstName);
        this.lastName = capitalize(this.lastName);
    }

    private String capitalize(String name) {
        if (name == null || name.trim().isEmpty()) {
            return name;
        }
        StringBuilder sb = new StringBuilder();
        boolean capitalizeNext = true;
        for (char c : name.toCharArray()) {
            if (Character.isWhitespace(c) || c == '-') {
                sb.append(c);
                capitalizeNext = true;
            } else if (capitalizeNext) {
                sb.append(Character.toUpperCase(c));
                capitalizeNext = false;
            } else {
                sb.append(Character.toLowerCase(c));
            }
        }
        return sb.toString();
    }
}