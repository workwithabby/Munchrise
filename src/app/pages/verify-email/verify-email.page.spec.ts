import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';

import { VerifyEmailPage } from './verify-email.page';
import { AuthService } from '../../services/auth.service';

@Component({ template: '', standalone: true })
class BlankPage {}

describe('VerifyEmailPage', () => {
  async function setup(email = 'abi@example.com') {
    await TestBed.configureTestingModule({
      imports: [VerifyEmailPage],
      providers: [provideRouter([{ path: '**', component: BlankPage }])],
    }).compileComponents();

    await TestBed.inject(Router).navigate(['/verify-email'], { queryParams: { email } });
    const auth = TestBed.inject(AuthService);
    const fixture = TestBed.createComponent(VerifyEmailPage);
    return { fixture, component: fixture.componentInstance, auth };
  }

  it('keeps only digits and at most 6 of them', async () => {
    const { component, auth } = await setup();
    vi.spyOn(auth, 'verifyOtp').mockResolvedValue({ ok: false, message: 'nope' });

    component.onCodeInput('12a 34-56789');
    await vi.waitFor(() => expect(auth.verifyOtp).toHaveBeenCalled());
    expect(auth.verifyOtp).toHaveBeenCalledWith('abi@example.com', '123456');
  });

  it('asks for all 6 digits before verifying', async () => {
    const { component, auth } = await setup();
    const spy = vi.spyOn(auth, 'verifyOtp');

    component.onCodeInput('123');
    await component.verify();

    expect(component.formError()).toContain('6-digit');
    expect(spy).not.toHaveBeenCalled();
  });

  it('shows the server message and clears the box when the code is wrong', async () => {
    const { component, auth } = await setup();
    vi.spyOn(auth, 'verifyOtp').mockResolvedValue({ ok: false, message: 'That code is wrong or has expired.' });

    component.code.set('111111');
    await component.verify();

    expect(component.formError()).toContain('wrong or has expired');
    expect(component.code()).toBe('');
  });

  it('goes to the home screen after a correct code', async () => {
    const { component, auth } = await setup();
    vi.spyOn(auth, 'verifyOtp').mockResolvedValue({ ok: true, message: 'Welcome, Abi!' });

    component.code.set('123456');
    await component.verify();

    expect(TestBed.inject(Router).url).toBe('/home');
  });

  it('only lets you resend after the countdown', async () => {
    const { component, auth } = await setup();
    const spy = vi.spyOn(auth, 'resendCode').mockResolvedValue({ ok: true, message: 'sent' });

    await component.resend();
    expect(spy).not.toHaveBeenCalled();

    component.cooldown.set(0);
    await component.resend();
    expect(spy).toHaveBeenCalledWith('abi@example.com');
    expect(component.cooldown()).toBeGreaterThan(0);
    component.ngOnDestroy();
  });

  it('shows "Sending…" while a new code is requested and ignores a second tap', async () => {
    const { fixture, component, auth } = await setup();
    let finish!: (r: { ok: boolean; message: string }) => void;
    const spy = vi.spyOn(auth, 'resendCode').mockReturnValue(new Promise((resolve) => (finish = resolve)));
    component.cooldown.set(0);

    const first = component.resend();
    const second = component.resend();
    fixture.detectChanges();

    expect(component.resending()).toBe(true);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Sending a new code');
    expect(spy).toHaveBeenCalledTimes(1);

    finish({ ok: true, message: 'sent' });
    await Promise.all([first, second]);
    expect(component.resending()).toBe(false);
    component.ngOnDestroy();
  });

  it('shows a masked version of the email the code was sent to', async () => {
    const { fixture, component } = await setup('hello@example.com');
    fixture.detectChanges();

    expect(component.maskedEmail()).toBe('he•••@example.com');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('he•••@example.com');
    component.ngOnDestroy();
  });

  it('draws six boxes and fills them as digits are typed', async () => {
    const { fixture, component } = await setup();
    component.code.set('42');
    fixture.detectChanges();

    const boxes = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.otp__box'));
    expect(boxes.length).toBe(6);
    expect(boxes.map((b) => b.textContent?.trim())).toEqual(['4', '2', '', '', '', '']);
    expect(component.activeBox()).toBe(2);
    component.ngOnDestroy();
  });

  describe('reset mode (Forgot password)', () => {
    async function setupReset() {
      await TestBed.configureTestingModule({
        imports: [VerifyEmailPage],
        providers: [
          provideRouter([{ path: '**', component: BlankPage }]),
          {
            provide: ActivatedRoute,
            useValue: {
              snapshot: { data: { mode: 'reset' }, queryParamMap: convertToParamMap({ email: 'abi@example.com' }) },
            },
          },
        ],
      }).compileComponents();

      const auth = TestBed.inject(AuthService);
      const fixture = TestBed.createComponent(VerifyEmailPage);
      return { fixture, component: fixture.componentInstance, auth };
    }

    it('checks the reset code, not the sign-up code, and then opens the new-password screen', async () => {
      const { component, auth } = await setupReset();
      const reset = vi.spyOn(auth, 'verifyResetCode').mockResolvedValue({ ok: true, message: 'Code verified.' });
      const signup = vi.spyOn(auth, 'verifyOtp');

      expect(component.isReset).toBe(true);
      component.code.set('123456');
      await component.verify();

      expect(reset).toHaveBeenCalledWith('abi@example.com', '123456');
      expect(signup).not.toHaveBeenCalled();
      expect(TestBed.inject(Router).url).toBe('/new-password');
    });

    it('stays on the code screen when the code is wrong', async () => {
      const { component, auth } = await setupReset();
      vi.spyOn(auth, 'verifyResetCode').mockResolvedValue({ ok: false, message: 'That code is wrong or has expired.' });

      component.code.set('111111');
      await component.verify();

      expect(component.formError()).toContain('wrong or has expired');
      expect(component.code()).toBe('');
      expect(TestBed.inject(Router).url).not.toBe('/new-password');
    });

    it('resends through the password-reset email', async () => {
      const { component, auth } = await setupReset();
      const spy = vi.spyOn(auth, 'requestPasswordReset').mockResolvedValue({ ok: true, message: 'sent' });
      component.cooldown.set(0);

      await component.resend();

      expect(spy).toHaveBeenCalledWith('abi@example.com');
    });
  });
});
