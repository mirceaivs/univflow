from pydantic import BaseModel, Field
from typing import List, Optional

class AskRequest(BaseModel):
    question: str

class QuizRequest(BaseModel):
    topic: Optional[str] = "conceptele principale"
    difficulty: str = "Mediu"
    num_questions: int = Field(default=5, ge=1, le=25)
    options_per_question: int = Field(default=4, ge=2, le=4)
    allow_multiple_correct: bool = False

class AnswerOption(BaseModel):
    text: str = Field(description="Textul variantei de răspuns")
    is_correct: bool = Field(description="True dacă este varianta corectă, False altfel")
    feedback: str = Field(description="Dacă e corectă, explică de ce. Dacă e greșită, explică unde e capcana sau de ce e incorectă.")

class QuizQuestion(BaseModel):
    question: str = Field(description="Întrebarea formulată din materia cursului")
    options: List[AnswerOption] = Field(description="Variantele de răspuns generate")
    explanation: str = Field(description="Explicația detaliată a răspunsului/răspunsurilor corecte")
    difficulty_level: str = Field(description="Confirmarea nivelului de dificultate")

class Quiz(BaseModel):
    questions: List[QuizQuestion]