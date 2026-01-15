"use client";

import React from "react";

export default function PrivacyPage() {
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
      {/* ✅ オーバーレイ削除（レイアウト共通の濃さに合わせる） */}

      {/* コンテンツカード */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 800,
          margin: "0 auto",
          padding: 24,
          borderRadius: 16,
          // ✅ 共通カード色に統一
          background: "rgba(0,0,0,0.55)",
          border: "1px solid rgba(255,255,255,0.12)",
          backdropFilter: "blur(6px)",
          boxShadow: "0 8px 30px rgba(0,0,0,0.4)",
        }}
      >
        <h1 style={{ fontSize: 24, marginBottom: 20 }}>プライバシーポリシー</h1>

        <p style={{ fontSize: 14, lineHeight: 1.8, marginBottom: 16 }}>
          当サービス「あらすじ街灯」（以下「当サービス」）では、
          ユーザーの皆様の情報を適切に取り扱うことを重要と考え、本プライバシーポリシー（以下「本ポリシー」）を定めます。
          当サービスをご利用いただく場合、本ポリシーに同意したものとみなします。
        </p>

        <h2 style={{ fontSize: 18, marginTop: 24 }}>第1条（収集する情報）</h2>
        <p style={{ fontSize: 14, lineHeight: 1.8 }}>
          当サービスが取得する情報は、ユーザーが入力する情報および利用時に自動的に生成・送信される情報を含み、主に次のとおりです：
        </p>
        <ul style={{ marginLeft: 20, fontSize: 14, lineHeight: 1.8 }}>
          <li>メールアドレス</li>
          <li>ユーザー名（表示名）</li>
          <li>プロフィール情報（自己紹介等、ユーザーが任意に入力したもの）</li>
          <li>投稿したコンテンツ（あらすじ、タイトル、タグ、URL、コメント等、ユーザーが投稿したもの）</li>
          <li>当サービス上での操作履歴（いいね、ブックマーク、フォロー等）</li>
          <li>端末情報・ログ情報（IPアドレス、ブラウザ種別、OS、アクセス日時、参照元等）</li>
          <li>Cookie 等の識別子およびこれに紐づく利用状況に関する情報</li>
        </ul>

        <h2 style={{ fontSize: 18, marginTop: 24 }}>第2条（利用目的）</h2>
        <p style={{ fontSize: 14, lineHeight: 1.8 }}>
          当サービスは、取得した情報を以下の目的で利用します：
        </p>
        <ul style={{ marginLeft: 20, fontSize: 14, lineHeight: 1.8 }}>
          <li>アカウント登録、ログイン認証、本人確認（メール認証を含む）のため</li>
          <li>投稿の表示、保存、編集、共有等、当サービスの提供・運営のため</li>
          <li>不正利用の防止、スパム対策、規約違反への対応のため</li>
          <li>お問い合わせ対応、ユーザーサポートのため</li>
          <li>当サービスの品質向上、機能改善、新機能開発、利用状況の分析のため</li>
          <li>重要なお知らせや運営上必要な連絡のため</li>
        </ul>

        <h2 style={{ fontSize: 18, marginTop: 24 }}>第3条（第三者提供）</h2>
        <p style={{ fontSize: 14, lineHeight: 1.8 }}>
          当サービスは、法令に基づく場合を除き、ユーザーの個人情報を本人の同意なく第三者へ提供しません。
          ただし、次条に定める外部サービスの利用（委託）に伴い、必要な範囲で情報を取り扱わせる場合があります。
        </p>

        <h2 style={{ fontSize: 18, marginTop: 24 }}>第4条（外部サービスの利用・委託）</h2>
        <p style={{ fontSize: 14, lineHeight: 1.8 }}>
          当サービスは、認証・データ保存・配信等のために外部サービス（例：Firebase 等）を利用する場合があります。
          これらのサービス提供事業者に対して、当サービスの運営に必要な範囲で情報の取扱いを委託することがあります。
          また、サービス提供事業者のサーバーが国外に所在する場合、情報が国外で保存・処理される可能性があります。
        </p>

        <h2 style={{ fontSize: 18, marginTop: 24 }}>第5条（データの管理）</h2>
        <p style={{ fontSize: 14, lineHeight: 1.8 }}>
          当サービスは、取得した情報について、適切なアクセス制御、通信の保護、権限管理等の安全管理措置を講じるよう努めます。
          ただし、インターネットの性質上、完全な安全性を保証するものではありません。
        </p>

        <h2 style={{ fontSize: 18, marginTop: 24 }}>第6条（保存期間）</h2>
        <p style={{ fontSize: 14, lineHeight: 1.8 }}>
          当サービスは、利用目的の達成に必要な期間、または法令・運営上必要な期間に限り情報を保存し、
          不要となった場合には、合理的な方法で削除または匿名化等の対応を行うよう努めます。
        </p>

        <h2 style={{ fontSize: 18, marginTop: 24 }}>第7条（ユーザーの権利）</h2>
        <p style={{ fontSize: 14, lineHeight: 1.8 }}>
          ユーザーは、当サービスが保有する自身の情報について、確認、修正、削除、利用停止等を求めることができます。
          手続きは、当サービスのお問い合わせ窓口よりご連絡ください。本人確認をお願いする場合があります。
        </p>

        <h2 style={{ fontSize: 18, marginTop: 24 }}>第8条（Cookie等の使用）</h2>
        <p style={{ fontSize: 14, lineHeight: 1.8 }}>
          当サービスは、ログイン状態の維持、利便性向上、利用状況の分析等のために Cookie 等を使用する場合があります。
          ユーザーは、ブラウザ設定により Cookie を無効化できますが、その場合一部機能が利用できないことがあります。
        </p>

        <h2 style={{ fontSize: 18, marginTop: 24 }}>第9条（アクセス解析等）</h2>
        <p style={{ fontSize: 14, lineHeight: 1.8 }}>
          当サービスは、利用状況の把握や改善のためにアクセス解析等を行う場合があります。
          解析により取得される情報には、通常、氏名等の直接的な個人識別情報は含まれません。
        </p>

        <h2 style={{ fontSize: 18, marginTop: 24 }}>第10条（未成年の利用）</h2>
        <p style={{ fontSize: 14, lineHeight: 1.8 }}>
          未成年のユーザーは、親権者等の法定代理人の同意を得たうえで当サービスをご利用ください。
        </p>

        <h2 style={{ fontSize: 18, marginTop: 24 }}>第11条（ポリシーの変更）</h2>
        <p style={{ fontSize: 14, lineHeight: 1.8 }}>
          本ポリシーは、必要に応じて変更されることがあります。
          変更後の内容は本ページに掲載された時点で効力を持つものとします。
        </p>

        <h2 style={{ fontSize: 18, marginTop: 24 }}>第12条（お問い合わせ）</h2>
        <p style={{ fontSize: 14, lineHeight: 1.8 }}>
          本ポリシーに関するお問い合わせは、当サービス内のお問い合わせ窓口よりご連絡ください。
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
