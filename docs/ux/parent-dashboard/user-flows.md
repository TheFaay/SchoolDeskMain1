# Parent dashboard user flows

Feature 3: Parent dashboard for SchoolDesk fees, results, and notices.

## 1. Log in and land on the dashboard

```mermaid
flowchart TD
    A([Start]) --> B[Open SchoolDesk]
    B --> C[Enter parent email and password]
    C --> D[Submit login]
    D --> E{Credentials valid?}
    E -- No --> F[Show sign-in error]
    F --> C
    E -- Yes --> G{Parent account active?}
    G -- No --> H[Show account access help]
    H --> Z([End])
    G -- Yes --> I[Load linked children and dashboard data]
    I --> J{Dashboard loaded?}
    J -- No --> K[Show dashboard load error and Retry]
    K --> I
    J -- Yes --> L[Show parent dashboard with child selector, results, fees, and notices]
    L --> Z
```

## 2. View a child's results

```mermaid
flowchart TD
    A([Dashboard]) --> B[Choose a child]
    B --> C[Open Results]
    C --> D[Load the child's results]
    D --> E{Load succeeded?}
    E -- No --> F[Show results load error and Retry]
    F --> D
    E -- Yes --> G{Results available?}
    G -- No --> H[Show no results yet]
    H --> Z([End])
    G -- Yes --> I[Show terms or assessment periods]
    I --> J[Choose a period]
    J --> K{Period results available?}
    K -- No --> L[Show no results for this period]
    L --> Z
    K -- Yes --> M[Show grades, subjects, and teacher comments]
    M --> Z([End])
```

## 3. Check school fees and amount owed

```mermaid
flowchart TD
    A([Dashboard]) --> B[Choose a child]
    B --> C[Open Fees]
    C --> D[Load fee account]
    D --> E{Load succeeded?}
    E -- No --> F[Show fees load error and Retry]
    F --> D
    E -- Yes --> G{Fee account available?}
    G -- No --> H[Show fee information unavailable and contact school option]
    H --> Z([End])
    G -- Yes --> I[Show charges, payments, and outstanding balance]
    I --> J{Amount owed?}
    J -- No --> K[Show account paid up]
    K --> Z
    J -- Yes --> L[Show amount due and due date]
    L --> M{Payment action available?}
    M -- Yes --> N[Offer payment instructions or payment option]
    M -- No --> O[Show how to contact the school about payment]
    N --> Z([End])
    O --> Z
```

## 4. Read a notice

```mermaid
flowchart TD
    A([Dashboard]) --> B[Open Notices]
    B --> C[Load notices]
    C --> D{Load succeeded?}
    D -- No --> E[Show notices load error and Retry]
    E --> C
    D -- Yes --> F{Any notices?}
    F -- No --> G[Show no notices yet]
    G --> Z([End])
    F -- Yes --> H[Show notice list]
    H --> I[Select a notice]
    I --> J{Notice details loaded?}
    J -- No --> K[Show notice load error and Retry]
    K --> I
    J -- Yes --> L[Show notice title, date, and message]
    L --> Z([End])
```
