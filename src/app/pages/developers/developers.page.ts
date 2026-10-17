import { NotificationBellComponent } from '../../components/notification-bell/notification-bell.component';
import { Component, inject } from '@angular/core';
import {
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonMenuButton,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';

import { CLASS_INFO, DEVELOPERS, TeamMember } from '../../data/developers';

/** One card per team member plus the class details (Section 8). */
@Component({
  selector: 'app-developers',
  templateUrl: './developers.page.html',
  styleUrls: ['./developers.page.scss'],
  standalone: true,
  imports: [
    NotificationBellComponent,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonMenuButton,
    IonTitle,
    IonToolbar,
  ],
})
export class DevelopersPage {
  readonly members: TeamMember[] = DEVELOPERS;
  readonly infoLines: string[] = CLASS_INFO.split('•').map((line) => line.trim());

  /** Icon for each class detail line, in order: course, section, school, professor. */
  readonly infoIcons = ['book-outline', 'people-outline', 'business-outline', 'school-outline'];

  private readonly gradients = [
    'linear-gradient(145deg, #e8843d, #c8481a)',
    'linear-gradient(145deg, #3fa0a9, #2b8089)',
    'linear-gradient(145deg, #e3b551, #b9851f)',
    'linear-gradient(145deg, #7fb069, #4a7c3f)',
    'linear-gradient(145deg, #c99b62, #8a5a2b)',
  ];

  avatarGradient(index: number): string {
    return this.gradients[index % this.gradients.length];
  }

  /** "Dela Cruz, Abigail B." -> "Abigail B. Dela Cruz" (easier to read on a card). */
  displayName(name: string): string {
    const [surname = '', given = ''] = name.split(',');
    return `${given.trim()} ${surname.trim()}`.trim();
  }

  /** "Crisostomo, John Steven G." -> "CJ", "Dela Cruz, Abigail B." -> "DA" */
  initials(name: string): string {
    const [surname = '', given = ''] = name.split(',');
    const first = surname.trim().charAt(0);
    const second = given.trim().charAt(0);
    return (first + second).toUpperCase();
  }
}
