package com.disertatie.univflow;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class UnivflowApplication {

	public static void main(String[] args) {
		SpringApplication.run(UnivflowApplication.class, args);
	}

}
