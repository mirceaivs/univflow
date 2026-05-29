package com.disertatie.univflow;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.aot.hint.annotation.RegisterReflectionForBinding;
import org.hibernate.dialect.PostgreSQLDialect;

@SpringBootApplication
@EnableAsync
@RegisterReflectionForBinding(PostgreSQLDialect.class)
public class UnivflowApplication {

	public static void main(String[] args) {
		SpringApplication.run(UnivflowApplication.class, args);
	}

}
