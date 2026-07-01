// =========================================================
// supabase-backend.js
// Include this AFTER your existing index.html <script> block
// (or move it into a separate <script> tag right before </body>,
// after the Supabase JS CDN tag):
//
//   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
//   ... your existing inline <script> with all the app code ...
//   <script src="supabase-backend.js"></script>
//
// This overrides requestBackend/backendAvailable so every apiCall(...)
// in your app now talks to Supabase instead of Google Apps Script.
// =========================================================

const SUPABASE_URL = "https://YOUR-PROJECT.supabase.co";
const SUPABASE_ANON_KEY = "YOUR-ANON-KEY";
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Always report the backend as available (no Apps Script URL needed)
backendAvailable = function () { return true; };

// Diocese full-name lookup cache (used for requestOtp email step)
let _pendingOtpDiocese = null;

async function _rpc(fn, args) {
  const { data, error } = await sb.rpc(fn, args);
  if (error) throw new Error(error.message || String(error));
  if (data && data.ok === false) throw new Error(data.error || "Request failed.");
  return data;
}

requestBackend = function (action, data, ok, fail, showLoading = true) {
  const failed = fail || loginFail;
  if (showLoading) showBackendLoading(action);
  const done = (result) => { if (showLoading) hideBackendLoading(); try { ok(result || {}); } catch (e) { failed(e.message || String(e)); } };
  const err = (e) => { if (showLoading) hideBackendLoading(); failed(e.message || String(e)); };

  (async () => {
    try {
      switch (action) {
        case "loginAdmin":
          return done(await _rpc("login_admin", { p_passcode: data.passcode }));

        case "loginUserPassword":
          return done(await _rpc("login_user_password", {
            p_email: data.email, p_diocese_name: data.diocese, p_passcode: data.passcode,
          }));

        case "requestOtp":
          _pendingOtpDiocese = data.diocese;
          { const { error } = await sb.auth.signInWithOtp({ email: data.email }); if (error) throw error; }
          return done({ ok: true });

        case "verifyOtp": {
          const { error: vErr } = await sb.auth.verifyOtp({ email: data.email, token: data.otp, type: "email" });
          if (vErr) throw vErr;
          return done(await _rpc("session_after_otp", { p_diocese_name: _pendingOtpDiocese || data.diocese }));
        }

        case "bootstrap":
          return done(await _rpc("bootstrap", { p_token: data.token }));

        case "publicConfig":
          { const { data: d, error } = await sb.rpc("public_config"); if (error) throw error; return done(d); }

        case "saveParticipants":
          return done(await _rpc("save_participants", { p_token: data.token, p_diocese_name: data.diocese, p_groups: data.groups }));

        case "updateParticipant":
          return done(await _rpc("update_participant", { p_token: data.token, p_student_id: data.studentId, p_patch: data.patch }));

        case "deleteParticipant":
          return done(await _rpc("delete_participant", { p_token: data.token, p_student_id: data.studentId }));

        case "clearAll":
          return done(await _rpc("clear_all", { p_token: data.token }));

        case "saveMark":
          return done(await _rpc("save_mark", {
            p_token: data.token, p_student_id: data.studentId, p_item_id: data.itemId,
            p_mark: data.mark, p_judge: data.judge, p_remarks: data.remarks,
          }));

        case "deleteMark":
          return done(await _rpc("delete_mark", { p_token: data.token, p_student_id: data.studentId, p_item_id: data.itemId }));

        case "saveMarksBulk":
          return done(await _rpc("save_marks_bulk", { p_token: data.token, p_entries: data.entries }));

        case "saveUserAccount":
          return done(await _rpc("save_user_account", { p_token: data.token, p_user: data.user }));

        case "saveSchool":
          return done(await _rpc("save_school", { p_token: data.token, p_school: data.school }));

        case "saveProgramme":
          return done(await _rpc("save_programme", { p_token: data.token, p_programme: data.programme }));

        case "saveSettings":
          return done(await _rpc("save_settings", { p_token: data.token, p_settings: data.settings }));

        case "saveCertificateTemplates":
          return done(await _rpc("save_certificate_templates", { p_token: data.token, p_templates: data.templates }));

        default:
          return err(new Error("Unknown action: " + action));
      }
    } catch (e) {
      return err(e);
    }
  })();
};

apiCall = function (action, data, ok, fail) { requestBackend(action, data, ok, fail, true); };
