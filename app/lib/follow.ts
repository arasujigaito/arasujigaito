// lib/follow.ts
import {
  doc,
  serverTimestamp,
  runTransaction,
  addDoc,
  collection,
  getDoc, // ✅ 追加
} from "firebase/firestore";
import { db } from "../firebase";

/**
 * フォロー / フォロー解除（A方式）
 * - 実体: users/{myUid}/following/{targetUid}
 * - 逆参照: users/{targetUid}/followers/{myUid}
 * - 正のカウント: users/{myUid}.followingCount / users/{targetUid}.followerCount を更新
 *
 * ✅ 重要：rulesの都合で FieldValue.increment は使わず、
 *    transaction内で現在値を読み、数値を計算して“number”で書き戻す
 */
export async function toggleFollow(myUid: string, targetUid: string) {
  if (!myUid || !targetUid || myUid === targetUid) return;

  const followingRef = doc(db, "users", myUid, "following", targetUid);
  const followerRef = doc(db, "users", targetUid, "followers", myUid);

  const myUserRef = doc(db, "users", myUid);
  const targetUserRef = doc(db, "users", targetUid);

  // ✅ まずフォロー本体はtransactionで確実に完了させる
  const didFollow = await runTransaction(db, async (tx) => {
    // すでにフォローしているか
    const followingSnap = await tx.get(followingRef);
    const isFollowing = followingSnap.exists();
    const delta = isFollowing ? -1 : 1;

    // カウントの現在値を読む（無い/不正なら0扱い）
    const myUserSnap = await tx.get(myUserRef);
    const targetUserSnap = await tx.get(targetUserRef);

    const myData = myUserSnap.exists() ? (myUserSnap.data() as any) : null;
    const targetData = targetUserSnap.exists()
      ? (targetUserSnap.data() as any)
      : null;

    const currentFollowingCount =
      typeof myData?.followingCount === "number" ? myData.followingCount : 0;
    const currentFollowerCount =
      typeof targetData?.followerCount === "number"
        ? targetData.followerCount
        : 0;

    const nextFollowingCount = Math.max(0, currentFollowingCount + delta);
    const nextFollowerCount = Math.max(0, currentFollowerCount + delta);

    if (isFollowing) {
      // フォロー解除
      tx.delete(followingRef);
      tx.delete(followerRef);
    } else {
      // フォローする
      tx.set(followingRef, {
        targetUid,
        createdAt: serverTimestamp(),
      });

      tx.set(followerRef, {
        followerUid: myUid,
        createdAt: serverTimestamp(),
      });
    }

    // ✅ number で書く（rulesの is int 判定に通る）
    tx.set(myUserRef, { followingCount: nextFollowingCount }, { merge: true });
    tx.set(targetUserRef, { followerCount: nextFollowerCount }, { merge: true });

    // ✅ transactionの戻り値：今回「フォローした」ならtrue
    return !isFollowing;
  });

  // ✅ 通知はtransaction外（失敗してもフォロー自体は成功させる）
  if (didFollow) {
    try {
      // ✅ 追加：自分の username を通知に載せる
      const meSnap = await getDoc(doc(db, "users", myUid));
      const fromName = meSnap.exists()
        ? ((meSnap.data() as any)?.username ?? null)
        : null;

      await addDoc(collection(db, "users", targetUid, "notifications"), {
        type: "follow",
        fromUid: myUid,
        fromName, // ✅ 追加
        createdAt: serverTimestamp(),
        read: false,
      });
    } catch {
      // 通知の権限(rules)などで失敗しても、フォローは成功しているので握りつぶす
    }
  }
}
