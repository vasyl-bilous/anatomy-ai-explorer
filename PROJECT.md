# Senior Full-Stack Developer – AI Prototyping Home Assignment

## Problem Statement

This assignment is designed to evaluate how you approach rapid product prototyping as a senior engineer in the AI era.

We expect candidates to work quickly and efficiently, leveraging modern AI tools, while also demonstrating strong engineering judgment, clear reasoning, and the ability to explain and justify technical decisions.

Pragmatic or "quick-and-simple" implementations are perfectly acceptable when there is a clear reason for them. We are not looking for a perfect production system. We are interested in how you prioritize, make tradeoffs, and move from idea to working MVP.

This assignment is intentionally somewhat open-ended. Prototype work often involves ambiguity, iteration, and product exploration. You are encouraged to add your own ideas, improvements, and interpretations where appropriate.

## Product Scenario

Build a lightweight biomedical research application.

The application allows users to explore parts of the human body, view details about selected regions, and generate an asynchronous AI analysis for a selected area.

## Technical Requirements

- The frontend must be implemented using **React + TypeScript**
- The backend must be implemented using **Node.js + NestJS**
- You may use any reasonable approach to state management or UI
- Mocked or simulated data is acceptable where appropriate

## Design Mockups

Design mockups can be viewed in Figma: [Dev_Test_CytoReason](https://www.figma.com/design/b8DWtDXfA6djTkms0rERIi/Dev_Test_CytoReason?node-id=0-66&m=dev)

The mockups are intended to communicate the general direction and user experience of the application, not as a complete or final specification. They do not cover every feature or state required by this document.

Please use the mockups as a guideline rather than a strict implementation requirement. Focus on implementing the functionality and interactions relevant to the requirements below.

Where additional components or states are needed that are not represented in the mockups, you are encouraged to design and implement them in a way that is consistent with the overall visual language and user experience of the provided designs.

## Main Explorer Screen

The main screen should include:

- A human body illustration with selectable regions
- A synchronized card/list view representing available regions
- Region selection and highlighting behavior
- Responsive layout behavior

### Interaction Expectations

- Clicking a region highlights the corresponding card
- Clicking a card highlights the corresponding region
- Selecting a region should **not** automatically navigate to another screen
- A separate action/button should be used to enter the drill-down mode

## Region Drill-Down Mode

After selecting a region, the user can navigate to a dedicated detail screen.

In the drill-down mode:

- The full-body illustration is replaced with a region-specific illustration
- The illustration should include highlighted dots/markers
- Markers should display tooltips or contextual information on hover
- A side panel should display details about the selected area in an accordion format

For the drill-down mode, we will provide a brain illustration.

Candidates can choose to:

- Implement only the provided drill-down scenario
- Or extend the experience to additional regions using their own implementation/design

## AI Analysis Flow

The drill-down screen should include a **"Generate AI Analysis"** action for the selected drill-down area.

The purpose of this feature is to simulate a realistic product workflow in which the user triggers a longer analysis process and receives generated insights once it completes. The analysis does not need to use a real AI model. It can be mocked, simulated, rule-based, or partially hardcoded.

When the user clicks "Generate AI Analysis", the UI should clearly indicate that the request has been initiated and that the result is not immediately available. The application should reflect a meaningful processing state before displaying the final output.

The flow should include the following behavior:

- **Idle:** the analysis has not yet been generated. The user can click "Generate AI Analysis".
- **Processing:** the analysis request is in progress. The UI should show a loading/progress indication and prevent duplicate submissions.
- **Completed:** the analysis result is available and displayed on the screen.
- **Failed:** the analysis could not be completed. The UI should display an error state and allow the user to retry.

The completed result should be presented as part of the drill-down screen. For example, it may include:

- A short generated summary
- Key findings or observations
- A confidence score or quality indicator
- A timestamp or status metadata

### Example Output

**Summary:**
Potential abnormal activity detected in the selected brain region.

**Key Findings:**

- Increased signal intensity around the selected marker
- Possible correlation with neighboring highlighted dots
- Moderate confidence based on available input data

**Confidence: 87%**

We are interested in how you approach asynchronous flows, state transitions, frontend/backend communication, user experience, and the architectural decisions behind your implementation.

## What We Care About

- Ability to prototype quickly
- Effective use of AI tools
- Engineering judgment and tradeoffs
- Code organization and maintainability
- Architecture and separation of concerns
- Thoughtful UX/product decisions
- Communication and ability to explain
- Ability to operate under ambiguity
- Initiative and ownership

## What We Don't Care About

- Pixel-perfect UI
- Significant visual polish
- Complex animations
- Large feature scope
- Perfect production readiness

## AI Usage

The use of AI tools is encouraged and expected.

Please include a short document describing:

- Which AI tools you used
- How they helped you
- Which decisions required manual engineering work
- How you reviewed or validated the generated code

## Submission

Please submit your assignment as a **Git repository** containing:

- The application source code
- A **README** file with setup and run instructions
- A short explanation of the architecture/design
- An **AI usage summary** describing how AI tools were used during development

The repository should run locally with clear instructions.

You may also include:

- Screenshots or short screen recordings
- A deployment/demo link
- Additional notes on tradeoffs or future improvements — what would you do with more time?

Please make sure your submission contains enough information for us to:

- Run the project
- Understand your decisions
- Review your architecture and implementation approach

> **We value prioritization, speed of execution, thoughtful tradeoffs, and clarity of reasoning over completeness of implementation.**

## Good Luck!

We look forward to reviewing your implementation and discussing your engineering decisions, tradeoffs, and prototyping approach.
