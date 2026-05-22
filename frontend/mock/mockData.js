export const WORKSPACE_DEFAULT_COURSE_NAME = 'Inteligență Artificială';

export const CHAT_LOADING_PHRASES = [
  'Răsfoiesc cursurile...',
  'Analizez PDF-urile...',
  'Caut referințe exacte...',
  'Sintetizez informația...',
  'Formulez răspunsul...',
];

export const MOCK_STREAMING_AI_REPLY =
  'Pe baza materialelor încărcate, conceptul de **Deadlock** (interblocaj) apare într-un sistem de operare atunci când un set de procese sunt blocate permanent, fiecare așteptând o resursă care este deținută de un alt proces din același set. \n\nPentru a preveni acest lucru, sistemele folosesc algoritmi precum Algoritmul Bancherului. [1]';

export const mockCourses = [
  { id: 1, name: 'Inteligență Artificială', docs: 14, score: 85, year: 'Anul 3', sem: 'Sem 1', icon: 'BrainCircuit' },
  { id: 2, name: 'Baze de Date', docs: 22, score: 100, year: 'Anul 2', sem: 'Sem 2', icon: 'Database' },
  { id: 3, name: 'Sisteme de Operare', docs: 8, score: 40, year: 'Anul 2', sem: 'Sem 1', icon: 'TerminalSquare' },
  { id: 4, name: 'Programare Orientată pe Obiecte', docs: 31, score: 100, year: 'Anul 1', sem: 'Sem 2', icon: 'Code2' },
  { id: 5, name: 'Rețele de Calculatoare', docs: 12, score: 74, year: 'Anul 3', sem: 'Sem 2', icon: 'TerminalSquare' },
];

export const mockMaterials = [
  { id: 1, name: 'Curs_01_Introducere.pdf', date: 'Adăugat acum 2 zile', size: '2.4 MB', type: 'pdf', tags: ['Curs', 'Intro'] },
  { id: 2, name: 'Note_Laborator_Cautare.pdf', date: 'Adăugat ieri', size: '1.1 MB', type: 'pdf', tags: ['Laborator', 'Algoritmi'] },
  { id: 3, name: 'Bibliografie_Suplimentara.docx', date: 'Adăugat acum o săptămână', size: '450 KB', type: 'doc', tags: ['Lectură'] },
];

export const mockChatHistory = [
  { id: 1, role: 'user', text: 'Explică-mi teorema lui Bayes din cursul de azi.' },
  {
    id: 2,
    role: 'ai',
    text: 'Conform materialelor din cursul de astăzi, **Teorema lui Bayes** descrie probabilitatea unui eveniment, bazată pe cunoștințele anterioare (apriori) ale condițiilor care ar putea fi legate de eveniment. [1]\n\nÎn esență, formula ne permite să actualizăm probabilitatea unei ipoteze atunci când obținem dovezi noi. Formula de bază prezentată a fost: [2]\n\n`P(A|B) = [P(B|A) * P(A)] / P(B)`\n\nUnde `P(A)` este probabilitatea apriori, iar `P(A|B)` este probabilitatea a posteriori. Iată un rezumat al conceptelor ilustrate prin exemplele din curs:',
    sources: [
      { id: 1, title: 'Curs 3 - Probabilități Condiționate', page: 12, text: '"Teorema lui Bayes stabilește o relație matematică precisă între probabilitatea apriori a unei ipoteze și probabilitatea ei a posteriori, în lumina noilor evidențe observate B."' },
      { id: 2, title: 'Curs 3 - Probabilități Condiționate', page: 15, text: '"Paradoxul fals-pozitivelor ilustrează importanța ratei de bază P(A). Chiar și cu un test precis P(B|A), dacă boala este rară, majoritatea rezultatelor pozitive vor fi alarme false."' },
    ],
  },
];

export const mockQuizQuestions = [
  {
    question: 'Care funcție de activare este cea mai susceptibilă la problema "vanishing gradient" la antrenarea rețelelor neuronale profunde?',
    options: [
      { id: 'A', text: 'Sigmoid. Adesea folosită în straturile de ieșire pentru clasificare binară, dar problematică în straturile ascunse profunde.' },
      { id: 'B', text: 'ReLU (Rectified Linear Unit). Returnează direct intrarea dacă este pozitivă.' },
      { id: 'C', text: 'Leaky ReLU. Permite un gradient mic, pozitiv când unitatea nu este activă.' },
      { id: 'D', text: 'Softmax. Convertește un vector de numere într-un vector de probabilități.' },
    ],
    correctAnswer: 'A',
    feedback: {
      correct:
        'Corect! Funcția Sigmoid "turtește" valorile mari de intrare într-un interval mic [0, 1], ceea ce face ca derivatele (gradienții) să fie foarte mici. Înmulțirea repetată a acestor gradienți mici în timpul backpropagation duce la "dispariția" lor.',
      incorrect:
        'Incorect. Răspunsul corect este Sigmoid. Funcția Sigmoid "turtește" valorile mari de intrare într-un interval mic [0, 1], ceea ce face ca derivatele (gradienții) să fie foarte mici. Înmulțirea repetată a acestor gradienți mici în timpul backpropagation duce la "dispariția" lor.',
    },
  },
  {
    question: 'Ce reprezintă fenomenul de "Overfitting" (supra-adaptare) în Machine Learning?',
    options: [
      { id: 'A', text: 'Modelul învață prea puține detalii și nu poate face predicții corecte nici pe datele de antrenament.' },
      { id: 'B', text: 'Modelul memorează zgomotul și detaliile specifice din datele de antrenament, pierzând capacitatea de generalizare.' },
      { id: 'C', text: 'Modelul se antrenează prea repede și necesită mai multe epoci pentru a converge.' },
      { id: 'D', text: 'Procesul prin care modelul își reduce automat numărul de parametri pentru a rula mai eficient.' },
    ],
    correctAnswer: 'B',
    feedback: {
      correct:
        'Excelent! Overfitting-ul apare când un model este prea complex și "învață pe de rost" datele de antrenament, inclusiv zgomotul, eșuând să generalizeze pe date noi.',
      incorrect:
        'Răspuns greșit. Overfitting-ul (B) înseamnă că modelul memorează zgomotul din datele de antrenament, pierzând capacitatea de generalizare pe date noi.',
    },
  },
  {
    question: 'Care dintre următorii algoritmi este folosit în mod specific pentru învățarea nesupervizată (Unsupervised Learning)?',
    options: [
      { id: 'A', text: 'Regresia Liniară (Linear Regression)' },
      { id: 'B', text: 'Arbori de Decizie (Decision Trees)' },
      { id: 'C', text: 'K-Means Clustering' },
      { id: 'D', text: 'Support Vector Machines (SVM)' },
    ],
    correctAnswer: 'C',
    feedback: {
      correct:
        'Corect! K-Means este un algoritm clasic de clustering folosit în învățarea nesupervizată pentru a grupa datele fără etichete predefinite.',
      incorrect:
        'Incorect. Răspunsul corect este K-Means Clustering. Ceilalți algoritmi enumerați sunt folosiți predominant pentru învățarea supervizată (clasificare sau regresie).',
    },
  },
  {
    question: 'În contextul rețelelor neuronale convoluționale (CNN), care este rolul principal al unui strat de "Pooling" (ex: Max Pooling)?',
    options: [
      { id: 'A', text: 'Să adauge non-liniaritate în rețea.' },
      { id: 'B', text: 'Să reducă dimensiunea spațială a reprezentării, scăzând numărul de parametri și calculul necesar.' },
      { id: 'C', text: 'Să mărească rezoluția imaginii pentru a detecta detalii mai fine.' },
      { id: 'D', text: 'Să calculeze funcția de pierdere (loss function) la finalul rețelei.' },
    ],
    correctAnswer: 'B',
    feedback: {
      correct:
        'Foarte bine! Straturile de Pooling reduc dimensiunile spațiale (lățime, înălțime), ajutând la controlul overfitting-ului și reducând costul computațional.',
      incorrect:
        'Greșit. Rolul principal al Pooling-ului (B) este de a reduce dimensiunea spațială a hărților de caracteristici, scăzând astfel numărul de parametri.',
    },
  },
  {
    question: 'Ce problemă rezolvă algoritmul Q-Learning în Reinforcement Learning?',
    options: [
      { id: 'A', text: 'Clasificarea imaginilor în timp real.' },
      { id: 'B', text: 'Găsirea celei mai bune politici de acțiune (policy) pentru un agent într-un mediu, maximizând recompensa totală.' },
      { id: 'C', text: 'Traducerea automată a textelor dintr-o limbă în alta.' },
      { id: 'D', text: 'Generarea de imagini noi pornind de la zgomot aleator (precum GAN-urile).' },
    ],
    correctAnswer: 'B',
    feedback: {
      correct:
        'Exact! Q-Learning este un algoritm de Reinforcement Learning care învață valoarea unei acțiuni într-o anumită stare pentru a găsi politica optimă.',
      incorrect:
        'Incorect. Q-Learning (B) este folosit în Reinforcement Learning pentru a învăța o politică optimă de acțiune care maximizează recompensa pe termen lung.',
    },
  },
];