# **LinkedIn Clone**

## **Project Description**

This is a LinkedIn clone developed using modern technologies. The project allows users to create profiles, connect with other users, share posts, and communicate via chat. The application was built to learn and gain practical experience with the Angular framework and Firebase backend.

## **Demo**

[**View the application here**](https://muscetb.github.io/LinkedInClone/)

## **Project Report (in Croatian)**

This repository contains a PDF document written in Croatian that accompanies the development of my LinkedIn Clone project.
(https://github.com/MuscetB/documents/blob/main/Dnevnik%20stru%C4%8Dne%20prakse%20-%20Borna%20Mu%C5%A1%C4%87et.pdf)

## **Features**

- Authentication (registration, login, Google login).
- User profile with editing capabilities.
- Posting and interacting with posts.
- Connecting and following other users.
- Notifications and connection requests.
- Real-time chat with activity and typing indicators.
- Google Maps API integration for displaying locations.

## **Technologies**

- **Frontend**: Angular, TypeScript, HTML, SCSS.
- **Backend**: Firebase (Firestore, Authentication, Storage).
- **Deployment**: GitHub Pages.

## **How to Set Up the Project Locally**

1. Clone the repository:

   -> git clone https://github.com/MuscetB/LinkedInClone.git
   -> cd LinkedInClone

2. Install dependencies:

   -> npm install

3. Configure Firebase:

   -> Open src/environments/environment.ts and add your Firebase configuration:

   export const environment = {
   production: false,
   firebaseConfig: {
   apiKey: "YOUR_API_KEY",
   authDomain: "YOUR_AUTH_DOMAIN",
   projectId: "YOUR_PROJECT_ID",
   storageBucket: "YOUR_STORAGE_BUCKET",
   messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
   appId: "YOUR_APP_ID",
   },
   };

4. Run the development server:

   -> ng serve

5. The application will be available at:

   -> http://localhost:4200

## Credits

Development of the project:

Author: Borna Mušćet

## Notes

This project was created solely for educational purposes and is not used in production!!!

# LinkedInCloneV1

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 18.0.2.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
