-- =============================================================
-- RLS POLICY SNAPSHOT
-- Captured from the live `transfer_dalaman` database on 2026-07-29.
--
-- Why this file exists: RLS is enabled on every public table and
-- is the app's only real security boundary, but the policies were
-- created ad-hoc in the Supabase dashboard and were NOT tracked in
-- this repo. This snapshot puts them under version control so the
-- security posture is reviewable and reproducible.
--
-- NOTE: On production these policies ALREADY EXIST — do not run
-- this file against prod as-is (CREATE POLICY errors on duplicates).
-- It is intended (a) as documentation, and (b) to provision a fresh
-- database / preview branch after the tables are created. To make it
-- re-runnable, prefix each statement with a matching
-- `DROP POLICY IF EXISTS ... ;`.
--
-- Security-relevant fixes to these policies live in
-- security-hardening.sql and security-hardening-2.sql — apply those
-- on top; this file reflects state BEFORE hardening #2.
-- =============================================================

-- ---------- booking_status_history ----------
CREATE POLICY "Admins full access to booking history" ON public.booking_status_history AS PERMISSIVE FOR ALL TO public
  USING (is_admin());
CREATE POLICY "Customers insert own booking history" ON public.booking_status_history AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((booking_id IN ( SELECT bookings.id FROM bookings WHERE (bookings.customer_id = auth.uid()))));
CREATE POLICY "Providers insert assigned booking history" ON public.booking_status_history AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((booking_id IN ( SELECT bookings.id FROM bookings WHERE (bookings.provider_id = my_provider_id()))));
CREATE POLICY "Customers see own booking history" ON public.booking_status_history AS PERMISSIVE FOR SELECT TO public
  USING ((booking_id IN ( SELECT bookings.id FROM bookings WHERE (bookings.customer_id = auth.uid()))));
CREATE POLICY "Providers see assigned booking history" ON public.booking_status_history AS PERMISSIVE FOR SELECT TO public
  USING ((booking_id IN ( SELECT bookings.id FROM bookings WHERE (bookings.provider_id = my_provider_id()))));

-- ---------- bookings ----------
CREATE POLICY "Admins full access to bookings" ON public.bookings AS PERMISSIVE FOR ALL TO public
  USING (("current_role"() = 'admin'::user_role));
CREATE POLICY "Customer creates bookings" ON public.bookings AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((customer_id = auth.uid()));
CREATE POLICY "Provider creates manual bookings" ON public.bookings AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((provider_id = my_provider_id()));
CREATE POLICY "Customer sees own bookings" ON public.bookings AS PERMISSIVE FOR SELECT TO public
  USING ((customer_id = auth.uid()));
CREATE POLICY "Driver sees own assigned bookings" ON public.bookings AS PERMISSIVE FOR SELECT TO public
  USING ((driver_id = my_driver_id()));
CREATE POLICY "Provider sees assigned bookings" ON public.bookings AS PERMISSIVE FOR SELECT TO public
  USING ((provider_id = my_provider_id()));
CREATE POLICY "Customer updates own bookings" ON public.bookings AS PERMISSIVE FOR UPDATE TO public
  USING ((customer_id = auth.uid()))
  WITH CHECK ((customer_id = auth.uid()));
-- NOTE: the two UPDATE policies below have no WITH CHECK column guard;
-- security-hardening-2.sql adds a trigger to block price tampering.
CREATE POLICY "Driver marks booking complete" ON public.bookings AS PERMISSIVE FOR UPDATE TO public
  USING ((driver_id = my_driver_id()));
CREATE POLICY "Provider updates assigned bookings" ON public.bookings AS PERMISSIVE FOR UPDATE TO public
  USING ((provider_id = my_provider_id()));

-- ---------- competition_entries ----------
CREATE POLICY "Customers insert own entries" ON public.competition_entries AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((customer_id = auth.uid()));
CREATE POLICY "Admins view all entries" ON public.competition_entries AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1 FROM users WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::user_role)))));
CREATE POLICY "Customers view own entries" ON public.competition_entries AS PERMISSIVE FOR SELECT TO authenticated
  USING ((customer_id = auth.uid()));
CREATE POLICY "Admins update entries" ON public.competition_entries AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((EXISTS ( SELECT 1 FROM users WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::user_role)))));

-- ---------- drivers ----------
CREATE POLICY "Admins full access to drivers" ON public.drivers AS PERMISSIVE FOR ALL TO public
  USING (("current_role"() = 'admin'::user_role));
CREATE POLICY "Providers manage own drivers" ON public.drivers AS PERMISSIVE FOR ALL TO public
  USING ((provider_id IN ( SELECT providers.id FROM providers WHERE (providers.user_id = auth.uid()))));
CREATE POLICY "Driver sees own record" ON public.drivers AS PERMISSIVE FOR SELECT TO public
  USING ((user_id = auth.uid()));

-- ---------- locations ----------
CREATE POLICY "Admins manage locations" ON public.locations AS PERMISSIVE FOR ALL TO public
  USING (("current_role"() = 'admin'::user_role));
CREATE POLICY "Anyone can read locations" ON public.locations AS PERMISSIVE FOR SELECT TO public
  USING ((is_active = true));

-- ---------- notifications ----------
CREATE POLICY "Admins full access to notifications" ON public.notifications AS PERMISSIVE FOR ALL TO public
  USING (("current_role"() = 'admin'::user_role));
CREATE POLICY "User sees own notifications" ON public.notifications AS PERMISSIVE FOR SELECT TO public
  USING ((user_id = auth.uid()));

-- ---------- payments ----------
CREATE POLICY "Admins full access to payments" ON public.payments AS PERMISSIVE FOR ALL TO public
  USING (("current_role"() = 'admin'::user_role));
CREATE POLICY "Customer sees own payments" ON public.payments AS PERMISSIVE FOR SELECT TO public
  USING ((booking_id IN ( SELECT bookings.id FROM bookings WHERE (bookings.customer_id = auth.uid()))));
CREATE POLICY "Provider sees payments for own bookings" ON public.payments AS PERMISSIVE FOR SELECT TO public
  USING ((booking_id IN ( SELECT bookings.id FROM bookings WHERE (bookings.provider_id = my_provider_id()))));

-- ---------- profiles ----------
-- NOTE: a legacy `profiles` table coexists with `users`; policies kept for completeness.
CREATE POLICY "Admins read all profiles" ON public.profiles AS PERMISSIVE FOR ALL TO public
  USING (is_admin());
CREATE POLICY "Users manage own profile" ON public.profiles AS PERMISSIVE FOR ALL TO public
  USING ((id = auth.uid()))
  WITH CHECK ((id = auth.uid()));
CREATE POLICY "Users upsert own profile" ON public.profiles AS PERMISSIVE FOR ALL TO public
  USING ((id = auth.uid()))
  WITH CHECK ((id = auth.uid()));
CREATE POLICY "Admins read all" ON public.profiles AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1 FROM profiles profiles_1 WHERE ((profiles_1.id = auth.uid()) AND (profiles_1.role = 'admin'::text)))));
CREATE POLICY "Users read own profile" ON public.profiles AS PERMISSIVE FOR SELECT TO public
  USING ((id = auth.uid()));

-- ---------- provider_cancelled_requests ----------
CREATE POLICY "Providers see own cancelled request refs" ON public.provider_cancelled_requests AS PERMISSIVE FOR SELECT TO public
  USING ((provider_id IN ( SELECT providers.id FROM providers WHERE (providers.user_id = auth.uid()))));

-- ---------- provider_route_prices ----------
CREATE POLICY prp_admin ON public.provider_route_prices AS PERMISSIVE FOR ALL TO public
  USING (is_admin())
  WITH CHECK (is_admin());
CREATE POLICY prp_write_own ON public.provider_route_prices AS PERMISSIVE FOR ALL TO public
  USING ((provider_id IN ( SELECT providers.id FROM providers WHERE (providers.user_id = auth.uid()))))
  WITH CHECK ((provider_id IN ( SELECT providers.id FROM providers WHERE (providers.user_id = auth.uid()))));
CREATE POLICY prp_select_own ON public.provider_route_prices AS PERMISSIVE FOR SELECT TO public
  USING ((provider_id IN ( SELECT providers.id FROM providers WHERE (providers.user_id = auth.uid()))));

-- ---------- providers ----------
CREATE POLICY "Admins full access to providers" ON public.providers AS PERMISSIVE FOR ALL TO public
  USING (("current_role"() = 'admin'::user_role));
CREATE POLICY "Anyone can view approved providers" ON public.providers AS PERMISSIVE FOR SELECT TO public
  USING ((is_approved = true));
-- NOTE: no WITH CHECK column guard; security-hardening-2.sql adds a
-- trigger blocking self-approval / commission changes.
CREATE POLICY "Provider manages own record" ON public.providers AS PERMISSIVE FOR UPDATE TO public
  USING ((user_id = auth.uid()));

-- ---------- quote_declines ----------
CREATE POLICY "Admins see all declines" ON public.quote_declines AS PERMISSIVE FOR ALL TO public
  USING (is_admin());
CREATE POLICY "Providers manage own declines" ON public.quote_declines AS PERMISSIVE FOR ALL TO public
  USING ((provider_id IN ( SELECT providers.id FROM providers WHERE (providers.user_id = auth.uid()))))
  WITH CHECK ((provider_id IN ( SELECT providers.id FROM providers WHERE (providers.user_id = auth.uid()))));
CREATE POLICY "Customers see declines on own requests" ON public.quote_declines AS PERMISSIVE FOR SELECT TO public
  USING ((request_id IN ( SELECT quote_requests.id FROM quote_requests WHERE (quote_requests.customer_id = auth.uid()))));

-- ---------- quote_offers ----------
CREATE POLICY "Admins read all quote offers" ON public.quote_offers AS PERMISSIVE FOR ALL TO public
  USING (is_admin());
CREATE POLICY "Providers manage own offers" ON public.quote_offers AS PERMISSIVE FOR ALL TO public
  USING ((provider_id IN ( SELECT providers.id FROM providers WHERE (providers.user_id = auth.uid()))));
-- WARNING: this policy leaks competitors' offers on any open request
-- to every authenticated user; security-hardening-2.sql DROPs it.
CREATE POLICY "Providers see offers on open requests" ON public.quote_offers AS PERMISSIVE FOR SELECT TO public
  USING ((request_id IN ( SELECT quote_requests.id FROM quote_requests WHERE (quote_requests.status = 'open'::text))));
CREATE POLICY customers_see_own_offers ON public.quote_offers AS PERMISSIVE FOR SELECT TO public
  USING ((request_id IN ( SELECT quote_requests.id FROM quote_requests WHERE (quote_requests.customer_id = auth.uid()))));
CREATE POLICY customers_update_own_request_offers ON public.quote_offers AS PERMISSIVE FOR UPDATE TO public
  USING ((request_id IN ( SELECT quote_requests.id FROM quote_requests WHERE (quote_requests.customer_id = auth.uid()))))
  WITH CHECK ((request_id IN ( SELECT quote_requests.id FROM quote_requests WHERE (quote_requests.customer_id = auth.uid()))));

-- ---------- quote_requests ----------
CREATE POLICY "Admins read all quote requests" ON public.quote_requests AS PERMISSIVE FOR ALL TO public
  USING (is_admin());
CREATE POLICY customers_own_requests ON public.quote_requests AS PERMISSIVE FOR ALL TO public
  USING ((customer_id = auth.uid()));
CREATE POLICY "Approved providers see open requests" ON public.quote_requests AS PERMISSIVE FOR SELECT TO public
  USING (((status = 'open'::text) AND (EXISTS ( SELECT 1 FROM providers WHERE ((providers.user_id = auth.uid()) AND (providers.is_approved = true))))));

-- ---------- quote_status_history ----------
CREATE POLICY "Admins see all history" ON public.quote_status_history AS PERMISSIVE FOR ALL TO public
  USING (is_admin());
CREATE POLICY "Customers see own quote history" ON public.quote_status_history AS PERMISSIVE FOR SELECT TO public
  USING ((quote_request_id IN ( SELECT quote_requests.id FROM quote_requests WHERE (quote_requests.customer_id = auth.uid()))));
CREATE POLICY "Providers see open request history" ON public.quote_status_history AS PERMISSIVE FOR SELECT TO public
  USING (((quote_request_id IN ( SELECT quote_requests.id FROM quote_requests WHERE (quote_requests.status = 'open'::text))) AND (EXISTS ( SELECT 1 FROM providers WHERE ((providers.user_id = auth.uid()) AND (providers.is_approved = true))))));

-- ---------- reviews ----------
CREATE POLICY "Admins full access to reviews" ON public.reviews AS PERMISSIVE FOR ALL TO public
  USING (("current_role"() = 'admin'::user_role));
CREATE POLICY "Customer creates own review" ON public.reviews AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((customer_id = auth.uid()));
CREATE POLICY "Anyone can read published reviews" ON public.reviews AS PERMISSIVE FOR SELECT TO public
  USING ((is_published = true));
CREATE POLICY "Customer reads own review" ON public.reviews AS PERMISSIVE FOR SELECT TO public
  USING ((customer_id = auth.uid()));
CREATE POLICY "Provider reads own reviews" ON public.reviews AS PERMISSIVE FOR SELECT TO public
  USING ((provider_id = my_provider_id()));

-- ---------- user_notifications ----------
CREATE POLICY "Admins see all notifications" ON public.user_notifications AS PERMISSIVE FOR ALL TO public
  USING (is_admin());
CREATE POLICY "Users see own notifications" ON public.user_notifications AS PERMISSIVE FOR ALL TO public
  USING ((user_id = auth.uid()))
  WITH CHECK ((user_id = auth.uid()));
CREATE POLICY notify_counterparties ON public.user_notifications AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (can_notify(user_id));

-- ---------- users ----------
CREATE POLICY "Admins full access to users" ON public.users AS PERMISSIVE FOR ALL TO public
  USING (is_admin());
CREATE POLICY "Users can insert own profile" ON public.users AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((id = auth.uid()));
CREATE POLICY "Customers see provider emails on own quotes" ON public.users AS PERMISSIVE FOR SELECT TO public
  USING ((id IN ( SELECT p.user_id FROM providers p WHERE (p.id IN ( SELECT qo.provider_id FROM quote_offers qo WHERE (qo.request_id IN ( SELECT qr.id FROM quote_requests qr WHERE (qr.customer_id = auth.uid()))))))));
CREATE POLICY "Providers see customer info on own bookings" ON public.users AS PERMISSIVE FOR SELECT TO public
  USING ((id IN ( SELECT bookings.customer_id FROM bookings WHERE (bookings.provider_id = my_provider_id()))));
CREATE POLICY "Providers see customer info on requests they offered on" ON public.users AS PERMISSIVE FOR SELECT TO public
  USING ((id IN ( SELECT qr.customer_id FROM (quote_requests qr JOIN quote_offers qo ON ((qo.request_id = qr.id))) WHERE (qo.provider_id = my_provider_id()))));
CREATE POLICY "Users see own profile" ON public.users AS PERMISSIVE FOR SELECT TO public
  USING ((id = auth.uid()));
CREATE POLICY "Users can update own profile" ON public.users AS PERMISSIVE FOR UPDATE TO public
  USING ((id = auth.uid()))
  WITH CHECK ((id = auth.uid()));

-- ---------- vehicles ----------
CREATE POLICY "Admins full access to vehicles" ON public.vehicles AS PERMISSIVE FOR ALL TO public
  USING (("current_role"() = 'admin'::user_role));
CREATE POLICY "Providers manage own vehicles" ON public.vehicles AS PERMISSIVE FOR ALL TO public
  USING ((provider_id IN ( SELECT providers.id FROM providers WHERE (providers.user_id = auth.uid()))));
CREATE POLICY "Anyone can view active vehicles" ON public.vehicles AS PERMISSIVE FOR SELECT TO public
  USING ((is_active = true));
