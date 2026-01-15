"use client";

import React from "react";

export default function TermsPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundImage: 'url("/hero-night-road.jpg")',
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
        padding: "40px 16px",
        color: "white",
      }}
    >
      {/* オーバーレイ */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background:
            "radial-gradient(circle at top, rgba(255,255,255,0.05), transparent 40%), rgba(0,0,0,0.6)",
          zIndex: 0,
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 800,
          margin: "0 auto",
          padding: 24,
          borderRadius: 16,
          background: "rgba(0,0,0,0.55)",
          border: "1px solid rgba(255,255,255,0.15)",
          backdropFilter: "blur(6px)",
          boxShadow: "0 8px 30px rgba(0,0,0,0.4)",
        }}
      >
        <h1 style={{ fontSize: 24, marginBottom: 20 }}>利用規約</h1>

        <p style={{ fontSize: 14, lineHeight: 1.8, marginBottom: 16 }}>
          本利用規約（以下「本規約」）は、「あらすじ街灯」（以下「当サービス」）の利用条件を定めるものです。
          当サービスを利用される方（以下「ユーザー」）は、本規約に同意したものとみなします。
        </p>

        <h2 style={{ fontSize: 18, marginTop: 24 }}>第1条（適用）</h2>
        <p style={{ fontSize: 14, lineHeight: 1.8 }}>
          1. 本規約は、ユーザーと当サービス運営者（以下「運営者」）との間の当サービスの利用に関わる一切の事項に適用されます。<br />
          2. 運営者が当サービス上で別途定めるルール、ガイドライン等は、本規約の一部を構成するものとします。
        </p>

        <h2 style={{ fontSize: 18, marginTop: 24 }}>第2条（ユーザー登録）</h2>
        <p style={{ fontSize: 14, lineHeight: 1.8 }}>
          1. 登録希望者が当サービスの定める方法によってユーザー登録を申請し、運営者が承認することで登録が完了します。<br />
          2. ユーザーは、登録情報に変更があった場合、速やかに変更手続きを行うものとします。<br />
          3. 運営者は、申請内容に虚偽がある場合や、過去に規約違反がある場合など、登録を相当でないと判断した場合、登録を承認しないことがあります。
        </p>

        <h2 style={{ fontSize: 18, marginTop: 24 }}>第3条（禁止事項）</h2>
        <ul style={{ marginLeft: 20, fontSize: 14, lineHeight: 1.8 }}>
          <li>法律または公序良俗に反する行為</li>
          <li>犯罪行為または犯罪を助長する行為</li>
          <li>他者の権利（著作権、プライバシー、名誉等）を侵害する行為</li>
          <li>なりすまし、虚偽情報の投稿</li>
          <li>誹謗中傷、差別、嫌がらせ、過度に暴力的・露骨に性的な表現</li>
          <li>個人情報を本人の同意なく掲載する行為</li>
          <li>スパム、荒らし、過度な宣伝・勧誘行為</li>
          <li>
            あらすじ欄に宣伝文、連絡先、誹謗中傷、無関係な文章等、
            当サービスの趣旨に反する内容を投稿する行為
          </li>
          <li>他者作品の無断転載、盗用など著作権侵害行為</li>
          <li>サービス運営を妨害する行為</li>
          <li>反社会的勢力への利益供与に該当する行為</li>
          <li>その他、運営者が不適切と判断する行為</li>
        </ul>

        <h2 style={{ fontSize: 18, marginTop: 24 }}>第4条（投稿内容の扱い）</h2>
        <p style={{ fontSize: 14, lineHeight: 1.8 }}>
          1. 投稿内容はユーザー自身の責任において作成されたものとし、必要な権利を有していることを保証するものとします。<br />
          2. ユーザーは、当サービスの運営・提供・紹介のために必要な範囲で、運営者が投稿内容を無償で利用できることを許諾します。<br />
          3. 投稿内容が本規約に違反する、またはそのおそれがあると判断した場合、運営者は事前通知なく削除・非公開等の措置を行うことができます。<br />
          4. あらすじ本文欄には、作品内容を要約した文章を投稿するものとし、当該欄の趣旨に反する内容が含まれる場合、運営者は修正・削除等の対応を行うことがあります。
        </p>

        <h2 style={{ fontSize: 18, marginTop: 24 }}>第5条（免責事項）</h2>
        <p style={{ fontSize: 14, lineHeight: 1.8 }}>
          1. 当サービスは、その完全性、安全性、正確性等について保証するものではありません。<br />
          2. ユーザー間または第三者との間で生じたトラブルについて、運営者は一切責任を負いません。<br />
          3. サービスの遅延、中断、停止、変更、終了により生じた損害について、運営者は責任を負いません。<br />
          4. 外部リンク先の内容・安全性について、運営者は責任を負いません。
        </p>

        <h2 style={{ fontSize: 18, marginTop: 24 }}>第6条（利用停止・登録抹消）</h2>
        <p style={{ fontSize: 14, lineHeight: 1.8 }}>
          ユーザーが本規約に違反した場合、運営者は事前通知なく、投稿削除、利用停止、登録抹消等の措置を講じることができます。
        </p>

        <h2 style={{ fontSize: 18, marginTop: 24 }}>第7条（規約変更）</h2>
        <p style={{ fontSize: 14, lineHeight: 1.8 }}>
          本規約は必要に応じて変更されることがあります。変更後の規約は、本ページに掲載された時点で効力を持つものとします。
        </p>

        <h2 style={{ fontSize: 18, marginTop: 24 }}>第8条（準拠法・管轄）</h2>
        <p style={{ fontSize: 14, lineHeight: 1.8 }}>
          本規約は日本法を準拠法とし、当サービスに関して生じた紛争については、運営者所在地を管轄する裁判所を第一審の専属的合意管轄裁判所とします。
        </p>

        <div style={{ textAlign: "right", marginTop: 32 }}>
          <button
            onClick={() => window.history.back()}
            style={{
              padding: "10px 20px",
              borderRadius: 8,
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.2)",
              color: "white",
              cursor: "pointer",
            }}
          >
            戻る
          </button>
        </div>
      </div>
    </div>
  );
}
