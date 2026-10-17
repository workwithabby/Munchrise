import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AlertController } from '@ionic/angular';

import { LoginPromptService } from './login-prompt.service';

describe('LoginPromptService', () => {
  let createdAlerts: { message?: string; buttons?: { text: string }[] }[];

  beforeEach(() => {
    createdAlerts = [];
    const fakeAlertController = {
      create: async (options: { message: string; buttons: { text: string }[] }) => {
        createdAlerts.push(options);
        return { present: async () => {} };
      },
    };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AlertController, useValue: fakeAlertController },
      ],
    });
  });

  it('shows the friendly message with Sign up and Log in buttons', async () => {
    const prompt = TestBed.inject(LoginPromptService);
    await prompt.show();

    expect(createdAlerts.length).toBe(1);
    expect(createdAlerts[0].message).toBe(
      'Create an account to order. Sign up or log in to continue.',
    );
    expect(createdAlerts[0].buttons?.map((b) => b.text)).toEqual(['Sign up', 'Log in']);
  });
});
