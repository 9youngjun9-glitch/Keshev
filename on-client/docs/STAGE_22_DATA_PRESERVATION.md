# 22단계 데이터 보존 계획 — 검증 중

이 문서는 소스에서 확인한 저장 계약, 실제로 수행 가능한 비파괴 백업·복구 확인, 지원되지 않거나 실행 검증되지 않은 절차를 구분합니다. 문서에 절차가 있다는 것만으로 이 PC에서 백업·복구를 했다는 뜻은 아닙니다. 비밀번호·토큰·API 키, 설정 JSON 전체, 사용자 경로와 백업 경로를 제출 문서나 대화에 붙이지 마세요.

## 1. 보존 대상과 코드에서 확인한 위치

| 데이터 | 코드에서 확인한 위치·내용 | 이 PC의 실제 상태 |
|---|---|---|
| 조치 요청·상태·감사 이력 | 호스트가 명시한 **기존 SQLite DB 전체**에 `src/actions/store.mjs`가 `alekov_action_intents`, `alekov_action_state`, `alekov_action_audit` 테이블을 추가합니다. 요청·영수증 식별자, scope/command, 확인 정보의 해시·만료 시각, 상태·버전, 결과 관측·감사 코드·시각을 기록합니다. 같은 DB에는 이 모듈이 소유하지 않는 애플리케이션 데이터도 있을 수 있습니다. | 조치 기능 활성 여부와 실제 DB 경로 모두 미확인 |
| 조치 설정 | `src/actions/action-startup-config.mjs`가 `--alekov-actions-config <절대경로>`로 지정된 설정에서 `databasePath`와 정책을 읽습니다. 서버는 `--alekov-actions`와 설정 경로를 함께 받아야 조치 기능을 구성합니다. 기존 단일 SQLite 파일을 확인하며 DB를 자동 생성·탐색·이전하지 않습니다. | 실제 서버 인자·설정 파일 경로 미확인 |
| 계정 연결 설정·등록 정보 | `tools/start-alekov.ps1`은 프로젝트 경로의 SHA-256을 사용해 현재 Windows 사용자의 User Profile 아래 `.aleph-keshev-<해시>`를 계산합니다. 코드상 구성은 `native.json`, `registry\\.alekov-native-registry.json`, `vault\\.alekov-owner.json`, 문맥별 `vault\\<contextFingerprint>.credential`입니다. | 이 PC의 실제 경로, 파일 존재, ACL 미확인 |
| AI 앱 자격 정보 | `src/ai/credential-vault.mjs`와 `tools/app-credentials.ps1`의 자격 레코드는 Windows DPAPI `CurrentUser` 보호를 사용하고 사용자·프로젝트·문맥에 결속됩니다. 평문 자격은 프로젝트 파일이나 Git에 보관하는 계약이 아닙니다. | 자격 레코드 존재·복호화·복구 가능 여부 미확인 |
| SDP 개인 설정·자격 | 별도의 SDP 호스트 설정을 지정한 서버 실행에서 사용하며 위치는 운영자가 지정합니다. | 실제 경로와 백업 정책 미확인 |
| 사용자·기기·사건·취약점 조회 결과 | API 응답/현재 화면에 전달됩니다. 이번에 확인한 코드에는 이 조회 결과를 장기 저장하는 별도 학생 DB 계약이 없습니다. | 실제 원천 자료·화면 응답 미확인 |

## 2. 조치 DB 사용 여부와 실제 경로 확인

일반 `tools/start-alekov.ps1` 실행은 `--alekov-actions` 및 `--alekov-actions-config`를 전달하지 않습니다. 따라서 일반 앱을 실행했다는 사실만으로 조치 DB가 켜졌다고 판단하지 않습니다. 소스상 조치 기능은 서버에 `--alekov-actions`와 `--alekov-actions-config <절대경로>`를 함께 주고, 동시에 유효한 `--native-host-config <절대경로>`와 `--sdp-host-config <절대경로>`도 지정해야 구성됩니다. 이 조합은 `--demo`와 함께 쓸 수 없습니다. 학생용 `start-alekov.ps1`은 조치 플래그를 제공하지 않으므로, 그 도구로 앱을 시작했다는 사실만으로 조치 기능이 활성화됐다고 보지 않습니다. 실제 호스트 구동 방식·활성 여부와 설정 파일 경로를 호스트 운영자가 확인해 준 경우에만 아래 확인을 진행합니다. 경로를 모르면 사용자 폴더나 프로젝트 전체를 검색하지 말고 여기서 멈춥니다. 이 문서는 실제 환경에 맞는 서버 명령이나 설정 경로를 만들어 내지 않습니다.

아래 읽기 전용 확인은 호스트가 알려 준 설정 파일에서 `databasePath`만 로컬 PowerShell에 표시합니다. 설정 전체를 출력하지 않습니다. 시작 시 설정 검증은 이미 존재하는 일반 단일 링크 파일과 SQLite 헤더 등을 확인하지만, 이 읽기 절차나 시작 검증만으로 DB 전체의 무결성, 서버 실행 중 조치 기능의 실제 사용, 업무 데이터의 정합성은 증명되지 않습니다. 경로에는 사용자 이름이 포함될 수 있으므로 이 출력도 공유하지 마세요.

```powershell
$configPath = Read-Host '호스트 운영자가 확인해 준 조치 설정 JSON의 전체 경로'
if (-not (Test-Path -LiteralPath $configPath -PathType Leaf)) { throw '설정 파일을 찾지 못했습니다.' }
$env:KESHEV_ACTION_CONFIG_PATH = $configPath
try {
  @'
import { readFileSync } from 'node:fs';
const config = JSON.parse(readFileSync(process.env.KESHEV_ACTION_CONFIG_PATH, 'utf8'));
if (config?.schema !== 'alekov.on-client.action-startup.v1' || typeof config.databasePath !== 'string') {
  throw new Error('조치 설정의 schema 또는 databasePath를 확인할 수 없습니다.');
}
console.log('databasePath (이 PC에서만 확인):');
console.log(config.databasePath);
'@ | node --input-type=module
  $inspectExit = $LASTEXITCODE
} finally {
  Remove-Item Env:KESHEV_ACTION_CONFIG_PATH -ErrorAction SilentlyContinue
}
if ($inspectExit -ne 0) { throw 'DB 경로를 확인하지 못했습니다. 경로를 추측하지 마세요.' }
```

이 절차는 설정에 적힌 경로를 읽을 뿐, 서버가 실행 중인지·조치가 실제 활성화됐는지·DB가 정상인지 증명하지 않습니다. 호스트가 실제 DB 경로를 확인해 주지 않으면 “실제 경로 미확인”으로 남기고 백업하지 않습니다.

## 3. 기존 SQLite DB 전체의 안전한 백업

아래는 호스트가 조치 기능과 실제 DB 경로를 확인했고, 저장소 밖의 **이미 존재하며 접근이 제한된** 백업 폴더를 지정할 수 있을 때의 구체적인 절차입니다. 새 백업 파일은 고유한 이름으로 만들어 기존 파일을 덮어쓰지 않습니다. 접근 권한을 확인할 수 없으면 진행하지 마세요.

1. 서버를 정상 종료합니다. 실행 창에서 `Ctrl+C`를 누르고 프로세스가 끝날 때까지 기다립니다.
2. `$sourceDb`에 확인된 `databasePath`, `$backupDir`에 저장소 밖의 기존 개인 백업 폴더 경로를 입력합니다.
3. 백업 폴더가 현재 Windows 계정만 접근할 수 있도록 보호돼 있는지 확인합니다. 아래 검사는 폴더 소유자와 ACL이 현재 사용자 SID 하나의 FullControl뿐이고 상속이 차단된 경우만 통과시킵니다. 통과하지 않으면 백업을 만들지 말고, ACL을 임의로 바꾸지 않습니다.
4. Node.js SQLite 온라인 백업 API로 DB 전체를 새 파일에 복사합니다. 원본과 사본 각각 `PRAGMA integrity_check`를 확인합니다.

```powershell
$sourceDb = Read-Host '호스트가 확인해 준 기존 SQLite databasePath'
$backupDir = Read-Host '저장소 밖의 접근 제한된 기존 백업 폴더 전체 경로'
if (-not (Test-Path -LiteralPath $sourceDb -PathType Leaf)) { throw '원본 DB 파일을 찾을 수 없습니다.' }
if (-not (Test-Path -LiteralPath $backupDir -PathType Container)) { throw '백업 폴더가 없으므로 진행하지 않습니다.' }
$ownerSid = [Security.Principal.WindowsIdentity]::GetCurrent().User.Value
$acl = Get-Acl -LiteralPath $backupDir
$rules = @($acl.GetAccessRules($true, $true, [Security.Principal.SecurityIdentifier]))
$inheritance = [Security.AccessControl.InheritanceFlags]::ContainerInherit -bor [Security.AccessControl.InheritanceFlags]::ObjectInherit
if ($acl.GetOwner([Security.Principal.SecurityIdentifier]).Value -ne $ownerSid -or
    -not $acl.AreAccessRulesProtected -or $rules.Count -ne 1 -or
    $rules[0].IdentityReference.Value -ne $ownerSid -or
    $rules[0].AccessControlType -ne [Security.AccessControl.AccessControlType]::Allow -or
    $rules[0].FileSystemRights -ne [Security.AccessControl.FileSystemRights]::FullControl -or
    $rules[0].InheritanceFlags -ne $inheritance) {
  throw '백업 폴더가 현재 사용자 전용 ACL인지 확인되지 않았습니다. 백업하지 않습니다.'
}
$env:KESHEV_DB_SOURCE = $sourceDb
$env:KESHEV_BACKUP_DIR = $backupDir
try {
  @'
import { DatabaseSync, backup } from 'node:sqlite';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
const sourcePath = process.env.KESHEV_DB_SOURCE;
const backupDir = process.env.KESHEV_BACKUP_DIR;
if (!sourcePath || !backupDir) throw new Error('백업 경로를 확인할 수 없습니다.');
const targetPath = join(backupDir, `keshev-db-${Date.now()}-${randomUUID()}.sqlite`);
if (resolve(sourcePath).toLowerCase() === resolve(targetPath).toLowerCase() || existsSync(targetPath)) {
  throw new Error('백업 대상이 원본과 같거나 이미 존재합니다.');
}
const check = db => {
  const row = db.prepare('PRAGMA integrity_check').get();
  if (row?.integrity_check !== 'ok') throw new Error('SQLite integrity_check가 통과하지 않았습니다.');
};
const source = new DatabaseSync(sourcePath, { readOnly: true });
try { check(source); await backup(source, targetPath); } finally { source.close(); }
const copy = new DatabaseSync(targetPath, { readOnly: true });
try { check(copy); } finally { copy.close(); }
console.log('백업 사본 integrity_check: ok');
console.log('백업 파일 경로 (이 PC에서만 확인; 공유하지 않음):');
console.log(targetPath);
'@ | node --input-type=module
  $backupExit = $LASTEXITCODE
} finally {
  Remove-Item Env:KESHEV_DB_SOURCE -ErrorAction SilentlyContinue
  Remove-Item Env:KESHEV_BACKUP_DIR -ErrorAction SilentlyContinue
}
if ($backupExit -ne 0) { throw '백업 또는 무결성 검사가 실패했습니다. 원본을 그대로 두고 사본을 검증 완료로 취급하지 마세요.' }
```

`integrity_check: ok`는 검사 시점의 SQLite 파일 구조만 확인합니다. 업무 데이터의 의미상 정합성, 백업 매체 권한, 실제 앱 동작까지 검증하지 않습니다. DB 전체에는 조치 테이블뿐 아니라 다른 앱 데이터도 포함될 수 있으므로 민감한 백업으로 취급해야 합니다. 이 프로젝트에서 자동·정기·암호화·오프사이트 백업이나 보존 기간은 확인되지 않았습니다. 실패 시 원본이나 생성된 사본을 덮어쓰거나 삭제하지 않습니다.

## 4. 백업에서 별도 복구 사본을 만들어 확인

프로젝트에서 설명할 수 있는 비파괴 복구 확인은 기존 백업을 **새 경로의 새 SQLite 파일**로 복원하고 구조를 읽을 수 있는지 확인하는 것까지입니다. 운영 DB 교체나 롤백은 아닙니다. 서버를 종료하고, 기존 백업 파일과 저장소 밖의 접근 제한된 기존 복구 폴더를 사용합니다. 복구 폴더에도 위 3절의 사용자 전용 ACL 검사를 동일하게 적용합니다.

```powershell
$backupDb = Read-Host '확인할 기존 백업 SQLite 파일의 전체 경로'
$recoveryDir = Read-Host '저장소 밖의 접근 제한된 기존 복구 폴더 전체 경로'
if (-not (Test-Path -LiteralPath $backupDb -PathType Leaf)) { throw '백업 파일을 찾지 못했습니다.' }
if (-not (Test-Path -LiteralPath $recoveryDir -PathType Container)) { throw '복구 폴더가 없으므로 진행하지 않습니다.' }
$ownerSid = [Security.Principal.WindowsIdentity]::GetCurrent().User.Value
$acl = Get-Acl -LiteralPath $recoveryDir
$rules = @($acl.GetAccessRules($true, $true, [Security.Principal.SecurityIdentifier]))
$inheritance = [Security.AccessControl.InheritanceFlags]::ContainerInherit -bor [Security.AccessControl.InheritanceFlags]::ObjectInherit
if ($acl.GetOwner([Security.Principal.SecurityIdentifier]).Value -ne $ownerSid -or
    -not $acl.AreAccessRulesProtected -or $rules.Count -ne 1 -or
    $rules[0].IdentityReference.Value -ne $ownerSid -or
    $rules[0].AccessControlType -ne [Security.AccessControl.AccessControlType]::Allow -or
    $rules[0].FileSystemRights -ne [Security.AccessControl.FileSystemRights]::FullControl -or
    $rules[0].InheritanceFlags -ne $inheritance) {
  throw '복구 폴더가 현재 사용자 전용 ACL인지 확인되지 않았습니다. 복구 사본을 만들지 않습니다.'
}
$env:KESHEV_DB_SOURCE = $backupDb
$env:KESHEV_BACKUP_DIR = $recoveryDir
try {
  @'
import { DatabaseSync, backup } from 'node:sqlite';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
const sourcePath = process.env.KESHEV_DB_SOURCE;
const recoveryDir = process.env.KESHEV_BACKUP_DIR;
if (!sourcePath || !recoveryDir) throw new Error('복구 경로를 확인할 수 없습니다.');
const recoveryPath = join(recoveryDir, `keshev-recovery-${Date.now()}-${randomUUID()}.sqlite`);
if (resolve(sourcePath).toLowerCase() === resolve(recoveryPath).toLowerCase() || existsSync(recoveryPath)) {
  throw new Error('복구 대상이 백업과 같거나 이미 존재합니다.');
}
const check = db => {
  const row = db.prepare('PRAGMA integrity_check').get();
  if (row?.integrity_check !== 'ok') throw new Error('SQLite integrity_check가 통과하지 않았습니다.');
};
const source = new DatabaseSync(sourcePath, { readOnly: true });
try { check(source); await backup(source, recoveryPath); } finally { source.close(); }
const restored = new DatabaseSync(recoveryPath, { readOnly: true });
try {
  check(restored);
  const names = new Set(restored.prepare("SELECT name FROM sqlite_schema WHERE type='table'").all().map(row => row.name));
  const required = ['alekov_action_intents', 'alekov_action_state', 'alekov_action_audit'];
  const present = required.filter(name => names.has(name));
  if (present.length !== 0 && present.length !== required.length) {
    throw new Error('조치 이력 테이블 구성이 일부만 있습니다. 운영 복구로 사용하지 마세요.');
  }
  console.log('복구 사본 integrity_check: ok');
  console.log(`조치 이력 테이블: ${present.length === required.length ? '세 테이블 확인' : '백업에서 미발견'}`);
} finally { restored.close(); }
console.log('복구 사본 경로 (이 PC에서만 확인; 공유하지 않음):');
console.log(recoveryPath);
'@ | node --input-type=module
  $restoreExit = $LASTEXITCODE
} finally {
  Remove-Item Env:KESHEV_DB_SOURCE -ErrorAction SilentlyContinue
  Remove-Item Env:KESHEV_BACKUP_DIR -ErrorAction SilentlyContinue
}
if ($restoreExit -ne 0) { throw '별도 복구 사본 검증이 실패했습니다. 운영 DB를 교체하지 마세요.' }
```

복구 확인은 SQLite 구조와 조치 테이블의 존재 여부만 봅니다. 업무상 레코드 정확성, 다른 앱 데이터와의 정합성, 실제 앱 연결·조치 결과는 검증하지 않습니다. `src/actions/README.md`는 기존 테이블 rollback이나 전체 DB 복원을 하지 말라고 명시합니다. 과거 DB를 활성화하면 상태와 감사 이력이 후퇴하고 이미 전달한 조치의 재전송 위험이 생길 수 있습니다. 그러므로 운영 DB 덮어쓰기, `databasePath`를 과거 사본으로 변경해 운영 재개, 기록 병합 또는 재집행은 지원·검증된 절차가 아닙니다. 운영 복구는 호스트 운영자가 원천 조치 상태와 DB 정합성을 확인하고 별도 승인해야 합니다.

## 5. 사용자별 설정의 보존·백업·복구 범위

### 코드상 경로와 데이터

`tools/start-alekov.ps1`은 `on-client` 폴더의 부모인 프로젝트 경로를 소문자화해 SHA-256을 계산하고, 현재 Windows 사용자 Profile 아래 `.aleph-keshev-<해시>`를 사용합니다. `tools/prepare-native-host.ps1`, `src/ai/credential-vault.mjs`, `tools/app-credentials.ps1`에서 확인한 항목은 다음과 같습니다.

- `native.json`: 연결 설정. 사용자 전용 ACL과 프로젝트 경로가 설정 검증에 사용됩니다.
- `registry\\.alekov-native-registry.json`: 사용자 SID와 프로젝트 폴더 identity에 연결된 등록 정보·이력.
- `vault\\.alekov-owner.json`: vault의 소유자·식별 표식.
- `vault\\<contextFingerprint>.credential`: Windows DPAPI `CurrentUser`로 보호된 문맥별 자격 레코드.

위는 소스의 경로·파일 계약이지, 이 PC에서 파일이 존재한다는 확인이 아닙니다. 프로젝트 경로가 바뀌면 계산되는 사용자별 폴더가 달라질 수 있습니다. vault는 사용자·프로젝트 문맥과 파일 identity/ACL을 확인하므로 해당 파일을 복사해도 다른 경로나 PC에서 복구된다고 보장할 수 없습니다.

### 지원되는 손실 방지와 복구 절차

현재 코드에서 확인되는 **앱 수준 사용자 설정 export/import, 안전한 파일 백업/복원 명령은 없습니다.** 따라서 사용자가 직접 파일을 복사하는 절차를 “검증된 백업”이라고 안내할 수 없습니다. 가능한 비파괴 조치는 기존 환경을 보존하는 것입니다.

1. 원래 프로젝트 폴더를 삭제·이동·이름 변경하지 않고, 원래 Windows 사용자 계정과 프로젝트 경로를 유지합니다.
2. `.aleph-keshev-*` 폴더와 그 안의 파일을 편집·삭제하지 않으며, 새 clone·다른 PC·다른 Windows 사용자로 복사하지 않습니다.
3. 같은 사용자·같은 프로젝트 경로에서 실행 도구가 기존 설정을 확인하도록 합니다. 실행 도구가 설정을 확인하지 못하면 설정을 복사·삭제하거나 재설치하지 말고 그 자리에서 중단합니다.

이 절차는 **기존 원본을 유지하는 방법이지 별도 백업이나 복구 시험이 아닙니다.** PC 또는 사용자 프로필을 이전해야 할 때 실제로 적용할 수 있는 프로젝트 내부 백업/복구 방법은 제공 코드에서 확인되지 않았습니다. 임의의 `Copy-Item`/`robocopy`로 파일만 옮기는 것은 ACL, 사용자 SID, 디렉터리 identity, DPAPI 보호가 보존된다고 보장할 수 없어 복구 방법으로 제시하지 않습니다.

조직에서 관리하는 Windows 사용자 프로필 백업·복원 수단을 사용하려는 경우에는 실행 전에 담당 관리자가 동일 사용자 SID, DPAPI `CurrentUser` 복호화 조건, ACL 및 원래 프로젝트 경로/identity가 보존되는지 확인해야 합니다. 관리자가 승인한 절차로만 프로필을 복원하고, 이 프로젝트가 그 백업 수단을 검증한 것은 아님을 기록합니다. 복원 뒤에도 같은 계정·경로에서 실행 도구가 설정을 확인하는지 점검할 수 있을 뿐이며, 이 확인만으로 AI 로그인·자격 복호화·외부 연결 성공이 증명되지는 않습니다. 이를 충족하는 승인된 절차가 없다면 사용자별 설정 백업/복구는 **미지원·미검증**으로 남깁니다.

“계정 연결 설정을 확인하지 못했습니다. 기존 설정과 학생 작업은 그대로 두었습니다.” 같은 ALEPH 실행 도구 오류는 위 저장 계약만으로 원인이나 복구 조치를 확정할 수 없습니다. 화면 문구에서 키·토큰·비밀번호·개인정보를 가린 뒤, 그 문구와 발생 시각, 반 이름을 과제 운영 SKT 담당자에게 보내세요. 키·토큰·비밀번호 값은 대화창에 붙여 넣지 마세요. 폴더를 삭제·복사하거나 재설치하지 마세요.

## 6. 이 계획의 실행·검증 상태

| 확인 항목 | 상태와 근거 |
|---|---|
| 조치 DB의 테이블·설정 입력 계약 | `src/actions/README.md`, `src/actions/store.mjs`, `src/actions/action-startup-config.mjs`, `src/server.mjs`를 읽어 확인 |
| 사용자별 설정 경로·DPAPI/identity 제약 | `tools/start-alekov.ps1`, `tools/prepare-native-host.ps1`, `src/ai/credential-vault.mjs`, `tools/app-credentials.ps1`를 읽어 확인 |
| 이 PC에서 조치가 활성화됐는지와 DB 실제 경로 | 미확인. 호스트가 설정 경로를 확인해 주지 않음 |
| SQLite 백업·복구 명령 실행, 백업 파일, 결과 | 미실행·미확인. 명령 예시는 절차이지 증거가 아님 |
| 사용자별 설정 실제 파일·ACL·백업 | 미확인. 직접 검색·복사하지 않음 |
| 다른 PC/Windows 사용자로 사용자별 설정 복원 | 제공 코드상 지원된 방법 없음. 관리자 프로필 백업·복원도 이 프로젝트에서 검증되지 않음 |
| 자동 백업·암호화 백업·보존 기간·폐기/오프사이트 정책 | 프로젝트에서 확인되지 않음. 별도 운영 정책 필요 |
| 운영 DB rollback·과거 DB 활성화 | `src/actions/README.md`에 따라 지원되지 않음. 이 계획도 권하지 않음 |

22단계 상태는 **검증 중**입니다. 코드 검토, 안내된 명령, 실제 실행, 무결성 검사 결과를 서로 바꿔 쓰지 않습니다. 실제 백업이나 별도 복구 사본을 수행한다면 실행 시각·근거·결과만 기록하고, 경로와 데이터 원문은 문서·대화·Git에 넣지 마세요.

## 7. 판정 보완 — 설정 위치의 로컬 확인과 복구 가능 경계

이 절은 5절의 저장 계약을 학생이 기존 프로젝트에서 비파괴적으로 확인하는 방법과, “백업”과 “원본 보존”의 차이를 명확히 합니다. 아래 절차는 설정 내용·자격·사용자 전체 경로를 출력하지 않고, 파일을 만들거나 수정하지 않습니다. 복제본이 아니라 **원래 프로젝트의 `on-client` 폴더**에서 실행해야 해당 경로 계산이 원래 프로젝트와 일치합니다.

### 사용자별 설정 경로와 존재·ACL 확인

아래 PowerShell은 `tools/start-alekov.ps1`과 같은 계산식으로 예상 `hostRoot`를 산출합니다. 화면에는 전체 경로 대신 존재 여부, 알려진 항목의 개수, 현재 Windows 사용자 전용 ACL 검사 결과만 출력합니다. 파일 내용은 읽지 않습니다. 예상 폴더가 없으면 만들지 않습니다.

```powershell
$onClient = (Get-Location).Path
if ((Split-Path -Leaf $onClient) -ne 'on-client') { throw '원래 프로젝트의 on-client 폴더에서 실행해야 합니다.' }
$projectRoot = Split-Path -Parent $onClient
$profileRoot = [Environment]::GetFolderPath([Environment+SpecialFolder]::UserProfile)
if ([string]::IsNullOrWhiteSpace($profileRoot)) { throw '현재 Windows 사용자 Profile 경로를 확인할 수 없습니다.' }
$hasher = [Security.Cryptography.SHA256]::Create()
try {
  $projectKey = ([BitConverter]::ToString($hasher.ComputeHash([Text.Encoding]::UTF8.GetBytes($projectRoot.ToLowerInvariant())))).Replace('-', '').ToLowerInvariant()
} finally { $hasher.Dispose() }
$hostRoot = Join-Path $profileRoot ('.aleph-keshev-' + $projectKey)
$registry = Join-Path $hostRoot 'registry'
$vault = Join-Path $hostRoot 'vault'
$nativeConfig = Join-Path $hostRoot 'native.json'
$registryFile = Join-Path $registry '.alekov-native-registry.json'
$vaultMarker = Join-Path $vault '.alekov-owner.json'
$ownerSid = [Security.Principal.WindowsIdentity]::GetCurrent().User.Value

function Test-ExpectedPrivateAcl([string]$Path) {
  try {
    $item = Get-Item -LiteralPath $Path -Force -ErrorAction Stop
    if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { return $false }
    $acl = Get-Acl -LiteralPath $Path -ErrorAction Stop
    $rules = @($acl.GetAccessRules($true, $true, [Security.Principal.SecurityIdentifier]))
    if ($acl.GetOwner([Security.Principal.SecurityIdentifier]).Value -ne $ownerSid -or
        -not $acl.AreAccessRulesProtected -or $rules.Count -ne 1 -or
        $rules[0].IdentityReference.Value -ne $ownerSid -or
        $rules[0].AccessControlType -ne [Security.AccessControl.AccessControlType]::Allow -or
        $rules[0].FileSystemRights -ne [Security.AccessControl.FileSystemRights]::FullControl) { return $false }
    if ($item.PSIsContainer) {
      $expectedInheritance = [Security.AccessControl.InheritanceFlags]::ContainerInherit -bor [Security.AccessControl.InheritanceFlags]::ObjectInherit
      if ($rules[0].InheritanceFlags -ne $expectedInheritance) { return $false }
    } elseif ($rules[0].InheritanceFlags -ne [Security.AccessControl.InheritanceFlags]::None) { return $false }
    return $true
  } catch { return $false }
}

$present = @()
if (Test-Path -LiteralPath $hostRoot) {
  $present += Get-Item -LiteralPath $hostRoot -Force
  foreach ($directory in @($registry, $vault)) {
    if (Test-Path -LiteralPath $directory -PathType Container) {
      $present += Get-Item -LiteralPath $directory -Force
      $present += @(Get-ChildItem -LiteralPath $directory -Force)
    }
  }
  if (Test-Path -LiteralPath $nativeConfig -PathType Leaf) { $present += Get-Item -LiteralPath $nativeConfig -Force }
}
$uniquePresent = @($present | Sort-Object -Property FullName -Unique)
$aclOk = $uniquePresent.Count -gt 0 -and @($uniquePresent | Where-Object { -not (Test-ExpectedPrivateAcl $_.FullName) }).Count -eq 0
$credentialCount = if (Test-Path -LiteralPath $vault -PathType Container) { @(Get-ChildItem -LiteralPath $vault -Filter '*.credential' -File -Force).Count } else { 0 }
[pscustomobject]@{
  ExpectedUserSettingsFolderExists = Test-Path -LiteralPath $hostRoot -PathType Container
  NativeConfigExists = Test-Path -LiteralPath $nativeConfig -PathType Leaf
  RegistryDirectoryExists = Test-Path -LiteralPath $registry -PathType Container
  RegistryRecordExists = Test-Path -LiteralPath $registryFile -PathType Leaf
  VaultDirectoryExists = Test-Path -LiteralPath $vault -PathType Container
  VaultOwnerMarkerExists = Test-Path -LiteralPath $vaultMarker -PathType Leaf
  CredentialRecordCount = $credentialCount
  EveryPresentItemHasExpectedOwnerOnlyAcl = $aclOk
}
```

이 검사는 존재 여부와 ACL 모양만 확인합니다. 설정 JSON의 유효성, 실제 로그인, DPAPI 자격 복호화, 저장된 데이터의 복구 가능성이나 외부 연결은 증명하지 않습니다. 결과를 공유할 때는 사용자 경로·파일 이름·설정 내용을 덧붙이지 말고 위의 요약 필드만 사용하세요.

### 사용자별 설정의 실제 백업·복구 가능성

| 작업 | 현재 확인된 절차 | 보장 범위·제한 |
|---|---|---|
| 기존 설정을 잃지 않기 | 원래 프로젝트 폴더와 현재 Windows 사용자 프로필을 그대로 두고, 위 읽기 전용 확인만 수행합니다. 실행 도구가 설정 오류를 내면 중단하고 운영 담당자 안내를 받습니다. | 원본을 보존할 뿐, 별도 백업본이나 복구 시험은 아닙니다. |
| 설정 파일만 별도 폴더에 복사 | 프로젝트에 export/import 또는 파일 복구 도구가 없어 절차로 제공하지 않습니다. `native.json`, registry, vault를 임의 복사하지 않습니다. | DPAPI `CurrentUser`, 사용자 SID, ACL, 프로젝트/디렉터리 identity 및 vault 문맥 결속 때문에 복사본이 다른 경로·사용자·PC에서 동작한다고 보장할 수 없습니다. |
| 다른 PC 또는 새 Windows 프로필로 이전 | 이 프로젝트에서 검증된 이관 절차가 없습니다. 이관이 필요하면 파일을 복사하지 말고 먼저 조직 관리자에게 문의합니다. | 관리자가 사용하는 전체 프로필/시스템 백업이 사용자 SID와 DPAPI 복호화 조건뿐 아니라 ACL, 원래 프로젝트 경로와 코드가 검사하는 디렉터리 identity까지 보존하는지 사전에 확인해야 합니다. 일반 파일 복사나 경로만 같은 새 폴더는 이 조건을 증명하지 않습니다. |
| 승인된 전체 백업에서 복원 | 위 조건을 만족한다고 관리자가 확인한 백업 수단이 있는 경우에만, 관리자 승인 절차로 원래 Windows 계정과 원래 프로젝트 위치에 복원합니다. 그 후 위 read-only 확인을 하고, 필요 시 실행 도구의 설정 확인 결과만 별도로 기록합니다. | 이 프로젝트는 해당 백업 수단이나 복원을 시험하지 않았습니다. 설정 확인 메시지 하나만으로 로그인·자격 복호화·AI/SDP 연결 성공을 주장할 수 없습니다. 적합한 관리 백업이 없으면 사용자별 설정의 백업·복원은 **현재 미지원·미검증**입니다. |

따라서 이 문서에서 **실행 가능한 프로젝트 수준 백업·복구 절차로 제공하는 것은 기존 SQLite DB를 새 파일로 백업하고, 또 다른 새 파일로 복구해 구조를 확인하는 방법뿐**입니다. 사용자별 설정에 대해서는 확인 가능한 저장 위치·종류와 원본 보존·이관 한계를 구체화했지만, 존재하지 않는 export/import 기능이나 검증되지 않은 수동 복사를 만들어 내지 않습니다. 두 절차 모두 실제 수행 전까지는 계획이며, 완료 증거가 아닙니다.
